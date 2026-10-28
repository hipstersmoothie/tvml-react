// Live chat over a WebSocket. stream.place chat messages
// (`place.stream.chat.message`) are ordinary AT Protocol records in each
// chatter's repo, with a `streamer` field naming the stream. Bluesky's
// Jetstream streams every such record from the whole network as JSON, and
// replays recent history from a `cursor`, so one socket gives both the
// backlog and new messages as they're posted.

import { skipToken, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppState } from "tvml-react";

import { profileQuery, profilesQuery } from "./queries";

const JETSTREAM = "wss://jetstream2.us-east.bsky.network/subscribe";
const COLLECTION = "place.stream.chat.message";

/** How many messages the stream page keeps (newest first). */
export const CHAT_LIMIT = 12;
/** How far back a new connection replays: Jetstream cursors are microseconds. */
const BACKFILL_US = 15 * 60 * 1_000_000;
/** An event this close to now means the replay has caught up. */
const CAUGHT_UP_US = 10 * 1_000_000;
const MAX_RETRY_MS = 30_000;
/** Messages arrive in bursts while replaying; render once per burst. */
const FLUSH_MS = 100;

export interface ChatMessage {
  uri: string;
  did: string;
  handle: string;
  text: string;
  createdAt: string;
  /** When Jetstream saw it (µs). Messages are ordered by this. */
  timeUs: number;
}

/**
 * - `connecting`: replaying recent chat
 * - `live`: caught up; new messages arrive as they're posted
 * - `reconnecting`: the socket closed; trying again with backoff
 * - `unavailable`: no WebSocket (the app wasn't started with TVMLReact.launch)
 */
export type ChatStatus = "connecting" | "live" | "reconnecting" | "unavailable";

/** Cached per streamer, so reopening a stream page resumes where it left off. */
interface ChatData {
  messages: Array<ChatMessage>;
  /** The last Jetstream event seen (µs). */
  cursor?: number;
}

export const chatKey = (did: string) => ["chat", did] as const;

/**
 * A streamer's chat, newest first. While `enabled` (and the app is in the
 * foreground) it holds one Jetstream socket open, reconnecting with backoff;
 * it closes when disabled, when the app is suspended and on unmount, and
 * resumes from the last event it saw.
 */
export function useStreamChat(did: string, enabled: boolean): { messages: Array<ChatMessage>; status: ChatStatus } {
  const client = useQueryClient();
  const foreground = useAppState() === "active";
  const active = enabled && foreground;
  const { data } = useQuery<ChatData>({ queryKey: chatKey(did), queryFn: skipToken, staleTime: Infinity });
  const [status, setStatus] = useState<ChatStatus>("connecting");

  useEffect(() => {
    if (!active) return;
    if (typeof WebSocket !== "function") {
      setStatus("unavailable");
      return;
    }
    const connection = new ChatConnection(client, did, setStatus);
    return () => connection.close();
  }, [client, did, active]);

  return { messages: data?.messages ?? [], status };
}

interface JetstreamEvent {
  did: string;
  time_us: number;
  kind: "commit" | "identity" | "account";
  commit?: {
    operation: "create" | "update" | "delete";
    collection: string;
    rkey: string;
    record?: { streamer?: string; text?: string; createdAt?: string };
  };
}

/** A message whose author's handle may not be known yet. */
type Pending = Omit<ChatMessage, "handle"> & { handle?: string };

class ChatConnection {
  private socket: WebSocket | null = null;
  private messages: Array<Pending>;
  private cursor: number | undefined;
  private caughtUp = false;
  private failures = 0;
  private closed = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  // Authors whose profile is being fetched, and ones that have none (or whose
  // lookup failed).
  private looking = new Set<string>();
  private unknown = new Set<string>();

  constructor(
    private readonly client: QueryClient,
    private readonly did: string,
    private readonly setStatus: (status: ChatStatus) => void,
  ) {
    const saved = client.getQueryData<ChatData>(chatKey(did));
    this.messages = saved?.messages ?? [];
    this.cursor = saved?.cursor;
    this.connect();
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearTimeout(this.flushTimer);
    this.detach();
    this.save();
  }

  private connect(): void {
    // Resume from the last event, but never replay more than the backfill window.
    const floor = Date.now() * 1000 - BACKFILL_US;
    const cursor = Math.max(this.cursor ?? 0, floor);
    const url = `${JETSTREAM}?wantedCollections=${COLLECTION}&cursor=${cursor}`;
    this.caughtUp = false;
    this.setStatus(this.failures > 0 ? "reconnecting" : "connecting");

    const socket = new WebSocket(url);
    socket.onmessage = (event) => {
      if (typeof event.data === "string") this.receive(event.data);
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.retry();
    };
    this.socket = socket;
  }

  private detach(): void {
    const socket = this.socket;
    if (!socket) return;
    this.socket = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.close();
  }

  private retry(): void {
    if (this.closed) return;
    this.setStatus("reconnecting");
    // 1 s, 2 s, 4 s … up to 30 s, with jitter so clients don't reconnect in step.
    const delay = Math.min(1000 * 2 ** this.failures, MAX_RETRY_MS) * (0.75 + Math.random() * 0.5);
    this.failures++;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private receive(data: string): void {
    let event: JetstreamEvent;
    try {
      event = JSON.parse(data) as JetstreamEvent;
    } catch {
      return;
    }
    // Every event (Jetstream also sends all account and identity changes)
    // moves the cursor and tells us how far the replay has got.
    this.cursor = event.time_us;
    if (!this.caughtUp && event.time_us >= Date.now() * 1000 - CAUGHT_UP_US) {
      this.caughtUp = true;
      this.failures = 0;
      this.setStatus("live");
    }

    const commit = event.commit;
    if (event.kind !== "commit" || !commit || commit.collection !== COLLECTION) return;
    const uri = `at://${event.did}/${COLLECTION}/${commit.rkey}`;

    if (commit.operation === "delete") {
      const before = this.messages.length;
      this.messages = this.messages.filter((m) => m.uri !== uri);
      if (this.messages.length !== before) this.scheduleFlush();
      return;
    }

    const record = commit.record;
    if (record?.streamer !== this.did || !record.text?.trim()) return;
    const message: Pending = {
      uri,
      did: event.did,
      text: record.text,
      createdAt: record.createdAt ?? new Date(event.time_us / 1000).toISOString(),
      timeUs: event.time_us,
    };
    this.messages = [message, ...this.messages.filter((m) => m.uri !== uri)]
      .sort((a, b) => b.timeUs - a.timeUs)
      .slice(0, CHAT_LIMIT);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    this.flushTimer ??= setTimeout(() => {
      this.flushTimer = undefined;
      this.flush();
    }, FLUSH_MS);
  }

  // Fill in authors' handles from the profile cache, look up the ones we
  // haven't seen (one batched request), and publish the messages whose author
  // is known.
  private flush(): void {
    if (this.closed) return;
    this.messages = this.messages.map((m) => (m.handle ? m : { ...m, handle: this.handleFor(m.did) }));
    const missing = [...new Set(this.messages.filter((m) => !m.handle).map((m) => m.did))].filter(
      (did) => !this.looking.has(did),
    );
    if (missing.length > 0) {
      for (const did of missing) this.looking.add(did);
      this.client
        .fetchQuery(profilesQuery(missing))
        .catch(() => [])
        .then((profiles) => {
          const found = new Set(profiles.map((p) => p.did));
          for (const did of missing) {
            this.looking.delete(did);
            if (!found.has(did)) this.unknown.add(did);
          }
          this.flush();
        });
    }
    this.save();
  }

  private handleFor(did: string): string | undefined {
    const profile = this.client.getQueryData(profileQuery(did).queryKey);
    if (profile) return profile.handle;
    // No Bluesky profile, or the lookup failed: a short form of the DID.
    if (profile === null || this.unknown.has(did)) return did.replace(/^did:plc:/, "").slice(0, 12);
    return undefined;
  }

  private save(): void {
    const ready = this.messages.filter((m): m is ChatMessage => m.handle !== undefined);
    this.client.setQueryData<ChatData>(chatKey(this.did), { messages: ready, cursor: this.cursor });
  }
}

// stream.place (and friends) over plain HTTP, with tvml-react's fetch.

export const STREAMPLACE = "https://stream.place";
const BSKY_APPVIEW = "https://public.api.bsky.app";
// Microcosm's AT Protocol indexes: Constellation answers "which records link
// to X", Slingshot serves any record and resolves identities. Together they
// make stream.place chat readable without its WebSocket.
const CONSTELLATION = "https://constellation.microcosm.blue";
const SLINGSHOT = "https://slingshot.microcosm.blue";
const TIMEOUT_MS = 15_000;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** GET `url`; rejects with an HttpError for HTTP errors, timeouts and network failures. */
async function request(url: string, signal?: AbortSignal): Promise<Response> {
  // One controller for both the caller's cancellation and our timeout.
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", cancel);
  const timer = setTimeout(
    () => controller.abort(new HttpError(0, "The request timed out")),
    TIMEOUT_MS,
  );
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new HttpError(response.status, errorMessage(response.status, await response.text()));
    }
    return response;
  } catch (error) {
    throw error instanceof TypeError ? new HttpError(0, "Network error") : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

function errorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    return parsed.message ?? parsed.error ?? `HTTP ${status}`;
  } catch {
    return `HTTP ${status}`;
  }
}

export async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  return (await (await request(url, signal)).json()) as T;
}

const query = (params: Record<string, string | number | Array<string>>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, String(v));
  }
  return search.toString();
};

// ---------------------------------------------------------------------------
// Livestreams

export type Activity =
  | { $type: "place.stream.defs#activityGame"; name: string }
  | { $type: "place.stream.defs#activityLabel"; label: string }
  | { $type: string };

/** `place.stream.livestream#livestreamView` */
export interface Livestream {
  uri: string;
  author: { did: string; handle: string };
  indexedAt: string;
  record: {
    title: string;
    createdAt: string;
    lastSeenAt?: string;
    activity?: Activity;
    tags?: Array<string>;
    url?: string;
  };
  viewerCount?: { count: number };
}

export async function getLiveStreams(signal?: AbortSignal): Promise<Array<Livestream>> {
  const { streams } = await getJSON<{ streams: Array<Livestream> }>(
    `${STREAMPLACE}/xrpc/place.stream.live.getLiveUsers?limit=50`,
    signal,
  );
  return streams.sort((a, b) => (b.viewerCount?.count ?? 0) - (a.viewerCount?.count ?? 0));
}

/** The current livestream for one streamer, or null if they're offline. */
export async function getLivestream(did: string, signal?: AbortSignal): Promise<Livestream | null> {
  try {
    // This endpoint's view has no viewer count; that comes from its own endpoint.
    const [stream, count] = await Promise.all([
      getJSON<Livestream>(`${STREAMPLACE}/api/livestream/${did}`, signal),
      getViewerCount(did, signal).catch(() => undefined),
    ]);
    return count === undefined ? stream : { ...stream, viewerCount: { count } };
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function getViewerCount(did: string, signal?: AbortSignal): Promise<number> {
  const { count } = await getJSON<{ count: number }>(`${STREAMPLACE}/api/view-count/${did}`, signal);
  return count;
}

/** HLS (CMAF) master playlist. 404s with `StreamNotLive` when offline. */
export const playlistUrl = (did: string) =>
  `${STREAMPLACE}/xrpc/place.stream.playback.getLivePlaylist?${query({ streamer: did })}`;

/** Resolves if the stream is playable right now, rejects with a readable error otherwise. */
export async function checkPlayable(did: string): Promise<void> {
  try {
    await request(playlistUrl(did));
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      throw new Error("This stream just ended.");
    }
    throw error;
  }
}

/** A live JPEG of the stream. `version` busts TVMLKit's image cache. */
export const thumbnailUrl = (did: string, version: number) =>
  `${STREAMPLACE}/api/playback/${did}/stream.jpg?v=${version}`;

export function activityName(activity: Activity | undefined): string | undefined {
  if (!activity) return undefined;
  if ("name" in activity) return activity.name;
  if ("label" in activity) return activity.label.replace(/_/g, " ");
  return undefined;
}

// ---------------------------------------------------------------------------
// Profiles (Bluesky AppView)

export interface Profile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  description?: string;
  followersCount?: number;
}

const jpeg = (url: string | undefined) =>
  url && !url.includes("@") ? `${url}@jpeg` : url;

export async function getProfiles(dids: Array<string>): Promise<Array<Profile>> {
  const batches: Array<Array<string>> = [];
  for (let i = 0; i < dids.length; i += 25) batches.push(dids.slice(i, i + 25));
  const results = await Promise.all(
    batches.map((actors) =>
      getJSON<{ profiles: Array<Profile> }>(
        `${BSKY_APPVIEW}/xrpc/app.bsky.actor.getProfiles?${query({ actors })}`,
      ),
    ),
  );
  return results
    .flatMap((r) => r.profiles)
    .map((p) => ({ ...p, avatar: jpeg(p.avatar), banner: jpeg(p.banner) }));
}

// ---------------------------------------------------------------------------
// Chat
//
// stream.place only pushes chat (`place.stream.chat.message`) over its
// WebSocket, which TVJS doesn't have. Chat messages are ordinary records in
// each chatter's repo with a `streamer` field, so Constellation can list the
// newest ones by backlink and Slingshot can fetch each record.

export interface ChatMessage {
  uri: string;
  did: string;
  handle: string;
  text: string;
  createdAt: string;
}

interface Backlink {
  did: string;
  collection: string;
  rkey: string;
}

const messageCache = new Map<string, Promise<ChatMessage | null>>();
const handleCache = new Map<string, Promise<string>>();

function resolveHandle(did: string): Promise<string> {
  let handle = handleCache.get(did);
  if (!handle) {
    handle = getJSON<{ handle: string }>(
      `${SLINGSHOT}/xrpc/com.bad-example.identity.resolveMiniDoc?${query({ identifier: did })}`,
    ).then(
      (doc) => doc.handle,
      () => did.slice(0, 16),
    );
    handleCache.set(did, handle);
  }
  return handle;
}

function getMessage({ did, collection, rkey }: Backlink): Promise<ChatMessage | null> {
  const uri = `at://${did}/${collection}/${rkey}`;
  let message = messageCache.get(uri);
  if (!message) {
    message = Promise.all([
      getJSON<{ value: { text: string; createdAt: string } }>(
        `${SLINGSHOT}/xrpc/com.atproto.repo.getRecord?${query({ repo: did, collection, rkey })}`,
      ),
      resolveHandle(did),
    ]).then(
      ([record, handle]) => ({
        uri,
        did,
        handle,
        text: record.value.text,
        createdAt: record.value.createdAt,
      }),
      () => {
        messageCache.delete(uri); // deleted record or transient error: retry next poll
        return null;
      },
    );
    messageCache.set(uri, message);
  }
  return message;
}

/** The newest chat messages for a streamer, newest first. */
export async function getRecentChat(
  streamerDid: string,
  signal?: AbortSignal,
  limit = 12,
): Promise<Array<ChatMessage>> {
  const { linking_records } = await getJSON<{ linking_records: Array<Backlink> }>(
    `${CONSTELLATION}/links?${query({
      target: streamerDid,
      collection: "place.stream.chat.message",
      path: ".streamer",
      limit,
    })}`,
    signal,
  );
  // Not cancelled with `signal`: records are cached and shared between polls.
  const messages = await Promise.all(linking_records.map(getMessage));
  return messages
    .filter((m): m is ChatMessage => m !== null && m.text.trim() !== "")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

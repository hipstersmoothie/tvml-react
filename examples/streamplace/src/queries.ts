// TanStack Query: the app's server state. Keys, fetchers and freshness rules
// live here; screens pick them up with `useScreenQuery` / `useQuery`.

import { QueryClient, queryOptions } from "@tanstack/react-query";

import {
  getChatBacklinks,
  getChatRecord,
  getLivestream,
  getLiveStreams,
  getProfiles,
  HttpError,
  resolveHandle,
  type Backlink,
  type ChatMessage,
  type Livestream,
  type Profile,
} from "./api";

export const LIVE_REFRESH_MS = 30_000;
export const STREAM_REFRESH_MS = 15_000;
export const CHAT_REFRESH_MS = 8_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx won't fix itself; network errors and 5xx get two more tries.
      retry: (failures, error) =>
        failures < 2 && !(error instanceof HttpError && error.status >= 400 && error.status < 500),
    },
  },
});

const byViewers = (streams: Array<Livestream>) =>
  [...streams].sort((a, b) => (b.viewerCount?.count ?? 0) - (a.viewerCount?.count ?? 0));

/** Everyone live now, most watched first. Polled while the home screen is up. */
export const liveStreamsQuery = queryOptions({
  queryKey: ["live"],
  queryFn: ({ signal }) => getLiveStreams(signal),
  select: byViewers,
  refetchInterval: LIVE_REFRESH_MS,
  staleTime: 10_000,
});

/**
 * One streamer's current livestream, or null when they're offline. Starts
 * from their entry in the live list, if it's there, while it refetches.
 */
export const livestreamQuery = (did: string) =>
  queryOptions({
    queryKey: ["stream", did],
    queryFn: ({ signal }) => getLivestream(did, signal),
    initialData: () =>
      queryClient.getQueryData(liveStreamsQuery.queryKey)?.find((s) => s.author.did === did),
    initialDataUpdatedAt: () => queryClient.getQueryState(liveStreamsQuery.queryKey)?.dataUpdatedAt,
    refetchInterval: STREAM_REFRESH_MS,
  });

/** The newest chat for a streamer, newest first. */
export const chatQuery = (did: string) =>
  queryOptions({
    queryKey: ["chat", did],
    queryFn: async ({ signal, client }): Promise<Array<ChatMessage>> => {
      const links = await getChatBacklinks(did, signal);
      const messages = await Promise.all(links.map((link) => chatMessage(client, link)));
      return messages
        .filter((m): m is ChatMessage => m !== null && m.text.trim() !== "")
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },
    refetchInterval: CHAT_REFRESH_MS,
  });

// Chat records and handles don't change, so each is fetched once and cached
// (until unused for `gcTime`). They aren't cancelled with the chat poll's
// signal because the next poll wants them too.
async function chatMessage(
  client: QueryClient,
  link: Backlink,
): Promise<ChatMessage | null> {
  const uri = `at://${link.did}/${link.collection}/${link.rkey}`;
  try {
    const [record, handle] = await Promise.all([
      client.ensureQueryData({
        queryKey: ["chat-record", uri],
        queryFn: () => getChatRecord(link),
        staleTime: Infinity,
      }),
      client.ensureQueryData({
        queryKey: ["handle", link.did],
        queryFn: () => resolveHandle(link.did).catch(() => link.did.slice(0, 16)),
        staleTime: Infinity,
      }),
    ]);
    return { uri, did: link.did, handle, ...record };
  } catch {
    return null; // deleted record or a transient error: tried again next poll
  }
}

/**
 * Bluesky profiles (avatars, names, bios) keyed by DID. Each batch also
 * fills the single-profile cache, so a pushed stream page has its streamer's
 * profile already.
 */
export const profilesQuery = (dids: Array<string>) =>
  queryOptions({
    queryKey: ["profiles", [...dids].sort()],
    queryFn: async ({ signal, client }) => {
      const profiles = await getProfiles(dids, signal);
      for (const p of profiles) client.setQueryData(profileQuery(p.did).queryKey, p);
      return profiles;
    },
    select: toRecord,
    staleTime: 10 * 60_000,
  });

export const profileQuery = (did: string) =>
  queryOptions({
    queryKey: ["profile", did],
    queryFn: async ({ signal }): Promise<Profile | null> => (await getProfiles([did], signal))[0] ?? null,
    staleTime: 10 * 60_000,
  });

function toRecord(profiles: Array<Profile>): Record<string, Profile> {
  return Object.fromEntries(profiles.map((p) => [p.did, p]));
}

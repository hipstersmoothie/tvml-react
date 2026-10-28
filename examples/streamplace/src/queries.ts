// TanStack Query: the app's server state. Keys, fetchers and freshness rules
// live here; screens pick them up with `useScreenQuery` / `useQuery`. (Chat
// isn't fetched: chat.ts writes it into the cache from a WebSocket.)

import { QueryClient, queryOptions } from "@tanstack/react-query";

import { getLivestream, getLiveStreams, getProfiles, HttpError, type Livestream, type Profile } from "./api";

export const LIVE_REFRESH_MS = 30_000;
export const STREAM_REFRESH_MS = 15_000;

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

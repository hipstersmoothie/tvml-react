// TanStack Query setup: the app's QueryClient and one `queryOptions` factory
// per kind of data, so keys, fetchers and freshness live in one place and
// screens share the same cache entries.

import { QueryClient, queryOptions } from "@tanstack/react-query";

import { loadFeed, lookupPodcast, searchPodcasts, topPodcasts } from "./api";
import { RequestError } from "./http";
import type { Podcast } from "./types";

const MINUTE = 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network trouble, timeouts and 5xx; a 404 or a broken feed won't
      // fix itself, so show those right away.
      retry: (failures, error) =>
        failures < 2 && error instanceof RequestError && error.retryable,
    },
  },
});

/** Apple Podcasts top shows, overall or for one genre. Updated about daily. */
export const chartQuery = (genreId?: number) =>
  queryOptions({
    queryKey: ["chart", genreId ?? "all"],
    queryFn: ({ signal }) => topPodcasts(genreId, signal),
    staleTime: 60 * MINUTE,
  });

/** iTunes directory search. Disabled for an empty term. */
export const searchQuery = (term: string) =>
  queryOptions({
    queryKey: ["search", term.toLowerCase()],
    queryFn: ({ signal }) => searchPodcasts(term, signal),
    enabled: term !== "",
    staleTime: 10 * MINUTE,
  });

/** iTunes lookup, for chart entries (which have no feed URL). */
export const podcastQuery = (id: string) =>
  queryOptions({
    queryKey: ["podcast", id],
    queryFn: ({ signal }) => lookupPodcast(id, signal),
    staleTime: 24 * 60 * MINUTE,
  });

/** A show's parsed RSS feed. */
export const feedQuery = (podcast: Podcast) =>
  queryOptions({
    queryKey: ["feed", podcast.id],
    queryFn: async ({ client, signal }) => {
      const feedUrl =
        podcast.feedUrl ?? (await client.ensureQueryData(podcastQuery(podcast.id))).feedUrl;
      if (!feedUrl) throw new Error("This podcast doesn't publish a feed.");
      return loadFeed(feedUrl, podcast.artwork, signal);
    },
    staleTime: 15 * MINUTE,
  });

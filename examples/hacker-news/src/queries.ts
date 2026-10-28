// TanStack Query options for each kind of data, shared by the screens.

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { fetchFeedIds, fetchStories, fetchThread, PAGE_SIZE, type FeedId, type Story } from "./hn";

interface FeedPage {
  /** Every story id in the feed, as of the first page's fetch. */
  ids: ReadonlyArray<number>;
  offset: number;
  /** The stories for `ids[offset, offset + PAGE_SIZE)`, minus deleted ones. */
  stories: Array<Story>;
}

/** Where the next page starts. `null` for the first page, which fetches the ids. */
type FeedPageParam = { ids: ReadonlyArray<number>; offset: number } | null;

/**
 * A feed, 30 stories per page. The first page fetches the feed's ids and later
 * pages carry them along, so a refresh (which refetches every loaded page,
 * starting from the first) reloads as many stories as are on screen from one
 * consistent list.
 */
export const feedQuery = (feed: FeedId) =>
  infiniteQueryOptions({
    queryKey: ["feed", feed],
    queryFn: async ({ pageParam, signal }): Promise<FeedPage> => {
      const ids = pageParam?.ids ?? (await fetchFeedIds(feed, signal));
      const offset = pageParam?.offset ?? 0;
      const stories = await fetchStories(ids.slice(offset, offset + PAGE_SIZE), signal);
      return { ids, offset, stories };
    },
    initialPageParam: null as FeedPageParam,
    getNextPageParam: (last): FeedPageParam | undefined =>
      last.offset + PAGE_SIZE < last.ids.length ? { ids: last.ids, offset: last.offset + PAGE_SIZE } : undefined,
    select: (data) => data.pages.flatMap((page) => page.stories),
    staleTime: 2 * 60_000,
  });

/** A story and its whole comment tree. */
export const threadQuery = (id: number) =>
  queryOptions({
    queryKey: ["thread", id],
    queryFn: ({ signal }) => fetchThread(id, signal),
    staleTime: 60_000,
  });

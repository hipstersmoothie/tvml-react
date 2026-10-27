import { useCallback, useState } from "react";

import { fetchFeedIds, fetchStories, PAGE_SIZE, type FeedId, type Story } from "./hn";
import { getQueryData, setQueryData, useQuery } from "./lib/query";

interface FeedData {
  ids: Array<number>;
  /** How many of `ids` have been fetched (some may have been deleted). */
  loaded: number;
  stories: Array<Story>;
}

function uniqueById(stories: Array<Story>): Array<Story> {
  const seen = new Set<number>();
  return stories.filter((s) => !seen.has(s.id) && (seen.add(s.id), true));
}

/** A paged HN story list: the first page loads automatically, `loadMore` adds the next. */
export function useFeed(feed: FeedId) {
  const key = `feed:${feed}`;
  const query = useQuery<FeedData>(
    key,
    async (signal) => {
      const ids = await fetchFeedIds(feed, signal);
      // On refresh, reload as many stories as are already on screen.
      const loaded = Math.max(getQueryData<FeedData>(key)?.loaded ?? 0, PAGE_SIZE);
      const stories = await fetchStories(ids.slice(0, loaded), { signal, maxAge: 0 });
      return { ids, loaded, stories };
    },
    { staleTime: 2 * 60_000 },
  );

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<Error>();

  const loadMore = useCallback(async () => {
    const data = getQueryData<FeedData>(key);
    if (!data || loadingMore || data.loaded >= data.ids.length) return;
    setLoadingMore(true);
    setLoadMoreError(undefined);
    try {
      const next = data.ids.slice(data.loaded, data.loaded + PAGE_SIZE);
      const more = await fetchStories(next);
      setQueryData<FeedData>(key, (current = data) => ({
        ...current,
        loaded: current.loaded + next.length,
        stories: uniqueById([...current.stories, ...more]),
      }));
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoadingMore(false);
    }
  }, [key, loadingMore]);

  const data = query.data;
  return {
    ...query,
    stories: data?.stories ?? [],
    hasMore: data ? data.loaded < data.ids.length : false,
    loadMore,
    loadingMore,
    loadMoreError,
  };
}

// Just enough persistence for TanStack Query so the dashboard can launch
// instantly (or offline) with the last good data. TanStack's own persisters
// are separate packages; this is the small part of one this app needs.
//
// A query opts in by spreading `persisted(slot, queryKey)` into its options:
// every successful fetch is written to localStorage under `slot` (by the
// QueryCache below), and on launch the saved copy becomes the query's
// `initialData`, with its real fetch time as `initialDataUpdatedAt` so
// `staleTime` decides whether it gets refetched. A slot holds one entry, and
// it's only used when it was saved for the same query key (an old forecast
// for another place or unit is ignored).

import { hashKey, QueryCache, type QueryKey } from "@tanstack/react-query";

interface Saved {
  hash: string;
  at: number;
  data: unknown;
}

function load(slot: string, queryKey: QueryKey): Saved | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(slot) ?? "null") as Saved | null;
    return saved?.hash === hashKey(queryKey) ? saved : undefined;
  } catch {
    return undefined;
  }
}

export function persisted<T>(slot: string, queryKey: QueryKey) {
  return {
    meta: { persist: slot },
    initialData: () => load(slot, queryKey)?.data as T | undefined,
    initialDataUpdatedAt: () => load(slot, queryKey)?.at,
  };
}

/** A QueryCache that saves the data of `persisted()` queries on success. */
export function createPersistingQueryCache(): QueryCache {
  return new QueryCache({
    onSuccess(data, query) {
      const slot = query.meta?.persist;
      if (typeof slot !== "string") return;
      const saved: Saved = { hash: query.queryHash, at: query.state.dataUpdatedAt, data };
      try {
        localStorage.setItem(slot, JSON.stringify(saved));
      } catch {
        // Storage full or unavailable: the app still works, it just won't launch from cache.
      }
    },
  });
}

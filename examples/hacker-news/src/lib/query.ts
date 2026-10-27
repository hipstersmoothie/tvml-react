// A tiny query cache: what `useQuery` from TanStack Query does, cut down to
// what a TV app needs. Results are cached per key and shared between screens,
// concurrent requests for the same key are de-duplicated, and stale data is
// refetched when the screen reappears or the app returns from the background.

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useAppEvent, useIsScreenVisible, useScreenEvent } from "tvml-react";

import { CancelledError, createCancelToken, type CancelSignal } from "./http";

export type QueryStatus = "loading" | "error" | "success";

export interface QueryState<T> {
  status: QueryStatus;
  data: T | undefined;
  error: Error | undefined;
  /** A request is in flight (the first load or a background refresh). */
  isFetching: boolean;
  /** When `data` was last fetched, in ms since the epoch. */
  updatedAt: number;
}

type Fetcher<T> = (signal: CancelSignal) => Promise<T>;

interface Entry<T> {
  state: QueryState<T>;
  listeners: Set<() => void>;
  inFlight?: { promise: Promise<void>; cancel(): void };
}

const cache = new Map<string, Entry<unknown>>();

const INITIAL: QueryState<never> = {
  status: "loading",
  data: undefined,
  error: undefined,
  isFetching: false,
  updatedAt: 0,
};

function entryFor<T>(key: string): Entry<T> {
  let entry = cache.get(key) as Entry<T> | undefined;
  if (!entry) {
    entry = { state: INITIAL, listeners: new Set() };
    cache.set(key, entry as Entry<unknown>);
  }
  return entry;
}

function update<T>(key: string, patch: Partial<QueryState<T>>): void {
  const entry = entryFor<T>(key);
  entry.state = { ...entry.state, ...patch };
  for (const listener of entry.listeners) listener();
}

/** Read the cached data for a key without subscribing. */
export function getQueryData<T>(key: string): T | undefined {
  return entryFor<T>(key).state.data;
}

/** Replace the cached data for a key (e.g. after loading another page). */
export function setQueryData<T>(key: string, data: T | ((current: T | undefined) => T)): void {
  const current = entryFor<T>(key).state.data;
  const next = typeof data === "function" ? (data as (c: T | undefined) => T)(current) : data;
  const { updatedAt } = entryFor<T>(key).state;
  update<T>(key, { data: next, status: "success", error: undefined, updatedAt: updatedAt || Date.now() });
}

/** Fetch `key`, sharing a request that's already in flight. */
export function fetchQuery<T>(key: string, fetcher: Fetcher<T>): Promise<void> {
  const entry = entryFor<T>(key);
  if (entry.inFlight) return entry.inFlight.promise;

  const token = createCancelToken();
  const promise = fetcher(token.signal).then(
    (data) => {
      entry.inFlight = undefined;
      update<T>(key, {
        status: "success",
        data,
        error: undefined,
        isFetching: false,
        updatedAt: Date.now(),
      });
    },
    (error: unknown) => {
      entry.inFlight = undefined;
      if (error instanceof CancelledError) {
        update<T>(key, { isFetching: false });
        return;
      }
      // Keep showing old data if a background refresh fails.
      update<T>(key, {
        status: entry.state.data === undefined ? "error" : "success",
        error: error instanceof Error ? error : new Error(String(error)),
        isFetching: false,
      });
    },
  );
  entry.inFlight = { promise, cancel: token.cancel };
  update<T>(key, { isFetching: true, ...(entry.state.status === "error" ? { status: "loading" } : {}) });
  return promise;
}

export interface QueryOptions {
  /** How long data counts as fresh, in ms. Defaults to 60s. */
  staleTime?: number;
  /** Refetch stale data when this screen appears again. Defaults to true. */
  refetchOnAppear?: boolean;
  /**
   * Refetch stale data when the app returns from the background, if this
   * screen is the one on the TV. Defaults to true.
   */
  refetchOnResume?: boolean;
}

export interface QueryResult<T> extends QueryState<T> {
  /** Fetch again now, even if the data is fresh. */
  refetch(): Promise<void>;
}

export function useQuery<T>(
  key: string,
  fetcher: Fetcher<T>,
  { staleTime = 60_000, refetchOnAppear = true, refetchOnResume = true }: QueryOptions = {},
): QueryResult<T> {
  const latestFetcher = useRef(fetcher);
  latestFetcher.current = fetcher;

  const state = useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const entry = entryFor<T>(key);
        entry.listeners.add(onChange);
        return () => {
          entry.listeners.delete(onChange);
          // Nobody is waiting for this any more.
          if (entry.listeners.size === 0) entry.inFlight?.cancel();
        };
      },
      [key],
    ),
    () => entryFor<T>(key).state,
  );

  const refetch = useCallback(() => fetchQuery(key, (s) => latestFetcher.current(s)), [key]);

  const refetchIfStale = useCallback(() => {
    const { updatedAt } = entryFor<T>(key).state;
    if (Date.now() - updatedAt > staleTime) void refetch();
  }, [key, staleTime, refetch]);

  // Hidden screens (other tabs, screens under a pushed one) catch up when
  // they appear instead of all refetching at once on resume.
  const visible = useIsScreenVisible();
  useEffect(refetchIfStale, [refetchIfStale]);
  useScreenEvent("appear", () => {
    if (refetchOnAppear) refetchIfStale();
  });
  useAppEvent("resume", () => {
    if (refetchOnResume && visible) refetchIfStale();
  });

  return { ...state, refetch };
}

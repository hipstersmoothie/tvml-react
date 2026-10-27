import { useCallback, useEffect, useRef, useState } from "react";
import { useAppEvent, useAppState, useLocalStorage, useNetworkStatus } from "tvml-react";

export interface LiveResource<T> {
  data: T | undefined;
  /** When `data` was fetched (ms since epoch). */
  fetchedAt: number | undefined;
  error: unknown;
  loading: boolean;
  refresh(): void;
}

interface Cached<T> {
  key: string;
  at: number;
  data: T;
}

export interface LiveResourceOptions {
  /** Refetch this often while the app is in the foreground and online. */
  refreshEvery: number;
  /** Cached data younger than this is used without refetching on launch/resume. */
  staleAfter?: number;
  enabled?: boolean;
}

/**
 * Data that should stay fresh on an always-on screen:
 *
 * - persisted to localStorage, so a relaunch (or launching offline) shows the
 *   last good data immediately;
 * - refetched on an interval, but only while the app is active and online
 *   (`useAppState`, `useNetworkStatus`);
 * - refetched when the app resumes (`useAppEvent("resume")`) or the network
 *   comes back, if the cache is stale.
 *
 * `key` identifies the request (e.g. the URL); changing it invalidates the cache.
 */
export function useLiveResource<T>(
  storageKey: string,
  key: string | undefined,
  load: () => Promise<T>,
  { refreshEvery, staleAfter = refreshEvery, enabled = true }: LiveResourceOptions,
): LiveResource<T> {
  const [cached, setCached] = useLocalStorage<Cached<T> | null>(storageKey, null);
  const [error, setError] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);
  const appState = useAppState();
  const { online } = useNetworkStatus();

  const latestLoad = useRef(load);
  latestLoad.current = load;
  // The key of the request in flight. A request for an older key (say, the
  // fallback location before geolocation answered) must not block or
  // overwrite the current one.
  const inFlight = useRef<string | undefined>(undefined);
  const currentKey = useRef(key);
  currentKey.current = key;

  const valid = cached && cached.key === key ? cached : undefined;
  const active = enabled && key !== undefined && appState === "active" && online;

  const refresh = useCallback(() => {
    if (key === undefined || inFlight.current === key) return;
    inFlight.current = key;
    setLoading(true);
    const settle = () => {
      if (inFlight.current !== key) return false;
      inFlight.current = undefined;
      setLoading(false);
      return currentKey.current === key;
    };
    latestLoad.current().then(
      (data) => {
        if (!settle()) return;
        setCached({ key, at: Date.now(), data });
        setError(undefined);
      },
      (reason: unknown) => {
        if (settle()) setError(reason);
      },
    );
  }, [key, setCached]);

  const refreshIfStale = useCallback(() => {
    if (!valid || Date.now() - valid.at > staleAfter) refresh();
  }, [valid, staleAfter, refresh]);

  // Launch, key change, coming back online, returning to the foreground.
  const latestRefreshIfStale = useRef(refreshIfStale);
  latestRefreshIfStale.current = refreshIfStale;
  useEffect(() => {
    if (active) latestRefreshIfStale.current();
  }, [active, key]);

  useAppEvent("resume", () => {
    if (enabled && online) latestRefreshIfStale.current();
  });

  // Periodic refresh; the interval is torn down while backgrounded or offline.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(refresh, refreshEvery);
    return () => clearInterval(id);
  }, [active, refresh, refreshEvery]);

  return { data: valid?.data, fetchedAt: valid?.at, error, loading, refresh };
}

// Data loading for screens: a keyed in-memory cache (so going back to a screen
// is instant) plus request cancellation when the key changes or the screen
// unmounts.

import { useCallback, useEffect, useState } from "react";

import { CancelledError, createCancelToken, type CancelToken } from "./http";

type Entry = { status: "done"; value: unknown; at: number } | { status: "error"; error: Error };

const cache = new Map<string, Entry>();
const MAX_AGE = 10 * 60 * 1000;

export type Resource<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "done"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

function fromCache<T>(key: string | null): Resource<T> {
  const entry = key === null ? undefined : cache.get(key);
  if (entry?.status === "done" && Date.now() - entry.at < MAX_AGE) {
    return { status: "done", data: entry.value as T };
  }
  return { status: "loading" };
}

/**
 * Load `key` with `load`, or skip while `key` is null. Returns the resource
 * and a `reload` function that bypasses the cache.
 */
export function useResource<T>(
  key: string | null,
  load: (token: CancelToken) => Promise<T>,
): [Resource<T>, () => void] {
  const [state, setState] = useState<{ key: string | null; resource: Resource<T> }>(() => ({
    key,
    resource: fromCache<T>(key),
  }));
  const [attempt, setAttempt] = useState(0);

  // Reset synchronously when the key changes so stale data never shows.
  let resource = state.resource;
  if (state.key !== key) {
    resource = fromCache<T>(key);
    setState({ key, resource });
  }

  const needsLoad = key !== null && resource.status === "loading";

  useEffect(() => {
    if (!needsLoad || key === null) return;
    const token = createCancelToken();
    load(token).then(
      (value) => {
        cache.set(key, { status: "done", value, at: Date.now() });
        if (!token.cancelled) setState({ key, resource: { status: "done", data: value } });
      },
      (error: unknown) => {
        if (error instanceof CancelledError || token.cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ key, resource: { status: "error", error: err } });
      },
    );
    return token.cancel;
    // `load` is intentionally not a dependency: it's keyed by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needsLoad, attempt]);

  const reload = useCallback(() => {
    if (key !== null) cache.delete(key);
    setState({ key, resource: { status: "loading" } });
    setAttempt((n) => n + 1);
  }, [key]);

  return [resource, reload];
}

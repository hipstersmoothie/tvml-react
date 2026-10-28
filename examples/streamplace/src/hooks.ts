import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState, useIsScreenVisible } from "tvml-react";

export type Remote<T> =
  | { status: "loading"; data?: undefined; error?: undefined; updatedAt?: undefined }
  | { status: "ready"; data: T; error?: Error; updatedAt: number }
  | { status: "error"; data?: undefined; error: Error; updatedAt?: undefined };

/**
 * Load `load()` now, then every `intervalMs`, but only while this screen is
 * the one on the TV and the app is in the foreground. Coming back to the
 * screen (popping a pushed screen, closing the player) or resuming the app
 * refreshes immediately. A failed refresh keeps the last good data and
 * reports the error alongside it. A refresh cancels the one before it.
 */
export function useLiveData<T>(
  load: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  options: {
    enabled?: boolean;
    /**
     * Keep polling while the screen is hidden. The fullscreen player hides
     * the screen that presented it, but its overlay still shows our data.
     */
    keepAlive?: boolean;
  } = {},
): Remote<T> & { refresh(): void } {
  const visible = useIsScreenVisible();
  const appState = useAppState();
  const active =
    (visible || options.keepAlive === true) && appState === "active" && options.enabled !== false;

  const [state, setState] = useState<Remote<T>>({ status: "loading" });
  const loadRef = useRef(load);
  loadRef.current = load;
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    inFlight.current?.abort();
    const { signal } = (inFlight.current = new AbortController());
    loadRef.current(signal).then(
      (data) => {
        if (!signal.aborted) setState({ status: "ready", data, updatedAt: Date.now() });
      },
      (error: unknown) => {
        if (signal.aborted) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) =>
          prev.status === "ready" ? { ...prev, error: err } : { status: "error", error: err },
        );
      },
    );
  }, []);

  useEffect(() => {
    if (!active) return;
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => {
      clearInterval(timer);
      inFlight.current?.abort();
    };
  }, [active, intervalMs, refresh]);

  return { ...state, refresh };
}

/** `Date.now()` that ticks every `intervalMs`, for "5 min ago" labels. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

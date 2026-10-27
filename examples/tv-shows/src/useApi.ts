import { useCallback, useEffect, useState } from "react";

import { getJSON } from "./api";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error; retry: () => void }
  | { status: "ready"; data: T };

/**
 * Load one or more TVMaze paths. `transform` turns the responses into what the
 * screen renders. Pass `null` to skip loading (e.g. an empty search).
 */
export function useApi<T>(
  paths: string | Array<string> | null,
  transform: (responses: Array<any>) => T = (responses) => responses[0] as T,
): ApiState<T> {
  const key = paths == null ? null : ([] as Array<string>).concat(paths).join("\n");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string | null; value: ApiState<T> }>({
    key: null,
    value: { status: "loading" },
  });

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (key == null) return;
    let cancelled = false;
    setState((current) =>
      current.key === key && current.value.status === "ready"
        ? current
        : { key, value: { status: "loading" } },
    );
    Promise.all(key.split("\n").map((path) => getJSON(path)))
      .then((responses) => {
        if (!cancelled) setState({ key, value: { status: "ready", data: transform(responses) } });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            key,
            value: {
              status: "error",
              error: error instanceof Error ? error : new Error(String(error)),
              retry,
            },
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // `transform` is expected to be a stable, pure function of the responses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return state.key === key ? state.value : { status: "loading" };
}

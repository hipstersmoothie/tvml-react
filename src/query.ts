// TanStack Query (React Query) integration for TVMLKit.
//
//   import { QueryClient } from "@tanstack/react-query";
//   import { TVMLQueryProvider, useScreenQuery } from "tvml-react/query";
//
//   launch(<App />, {
//     wrapper: ({ children }) => <TVMLQueryProvider client={client}>{children}</TVMLQueryProvider>,
//   });
//
// What it wires up:
// - TVJS has no `window`, so TanStack Query would assume it's on a server and
//   turn off polling (`refetchInterval`) and retries. This tells it otherwise.
// - "Window focus" is the app resuming (App.onResume), so
//   `refetchOnWindowFocus` refetches stale data when the user comes back.
// - "Online" follows the Apple TV's connectivity (native bridge, or polling
//   TVJS's Device.isNetworkReachable), so queries pause offline and refetch
//   on reconnect.
// - `useScreenQuery` / `useScreenInfiniteQuery` / `useScreenQueries` pause
//   refreshing while their screen is hidden (hidden tabs, covered screens) and
//   refetch stale data when it appears again. The data stays cached
//   throughout. `refreshWhileHidden: true` opts a query out.

import {
  environmentManager,
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
  type DefaultError,
  type DefinedInitialDataOptions,
  type DefinedUseQueryResult,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getNetworkStatus, onNetworkStatusChange } from "./native.js";
import { getAppState, onAppStateChange } from "./platform.js";
import { useIsScreenVisible } from "./screen.js";

let installed = false;

/** Point TanStack Query's focus/online/environment managers at TVJS. Idempotent. */
export function installQueryIntegration(): void {
  if (installed) return;
  installed = true;

  environmentManager.setIsServer(() => false);

  focusManager.setEventListener((setFocused) => {
    setFocused(getAppState() === "active");
    return onAppStateChange((state) => setFocused(state === "active"));
  });

  onlineManager.setEventListener((setOnline) => {
    setOnline(getNetworkStatus().online);
    return onNetworkStatusChange((status) => setOnline(status.online));
  });
}

export interface TVMLQueryProviderProps {
  /** Defaults to a QueryClient with `retry: 1` and `staleTime: 30s`. */
  client?: QueryClient;
  children?: ReactNode;
}

/** QueryClientProvider with the TVJS integration installed. */
export function TVMLQueryProvider({ client, children }: TVMLQueryProviderProps) {
  const [queryClient] = useState(() => {
    installQueryIntegration();
    return (
      client ??
      new QueryClient({
        defaultOptions: {
          queries: {
            // Defaults tuned for a TV: show errors sooner than three retries
            // with backoff would, and don't refetch everything on every resume.
            retry: 1,
            staleTime: 30_000,
          },
        },
      })
    );
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

// While the screen is hidden, keep the query subscribed (so its data isn't
// garbage-collected and in-flight requests aren't cancelled) but stop
// refreshing it; when the screen reappears, refetch if the data is stale.
export interface ScreenQueryOptions {
  /**
   * Keep refreshing while the screen is hidden, e.g. data drawn in a player
   * overlay, whose screen is covered while the video plays.
   */
  refreshWhileHidden?: boolean;
}

function pausedWhileHidden<T extends {
  refetchInterval?: unknown;
  refetchOnWindowFocus?: unknown;
  refetchOnReconnect?: unknown;
}>(options: T & ScreenQueryOptions, visible: boolean): T {
  const { refreshWhileHidden, ...query } = options;
  if (visible || refreshWhileHidden) return query as T;
  return {
    ...query,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  } as T;
}

function usePausedWhileHidden<T extends {
  refetchInterval?: unknown;
  refetchOnWindowFocus?: unknown;
  refetchOnReconnect?: unknown;
}>(options: T & ScreenQueryOptions): T {
  return pausedWhileHidden(options, useIsScreenVisible());
}

// When the screen reappears, refetch these queries if their data is stale.
function useRefetchOnReappear(queryKeys: Array<QueryKey>): void {
  const client = useQueryClient();
  const visible = useIsScreenVisible();
  const wasVisible = useRef(visible);
  const keys = useRef(queryKeys);
  keys.current = queryKeys;
  useEffect(() => {
    if (visible && !wasVisible.current) {
      for (const queryKey of keys.current) {
        void client.refetchQueries({ queryKey, exact: true, stale: true, type: "active" });
      }
    }
    wasVisible.current = visible;
  }, [visible, client]);
}

/**
 * `useQuery` that pauses while its screen is hidden: no polling, focus or
 * reconnect refetches while another screen covers it or its tab isn't
 * selected, and a refetch of stale data when it reappears. The data stays
 * cached the whole time. Pass `refreshWhileHidden: true` (or use `useQuery`)
 * to keep refreshing while hidden.
 */
export function useScreenQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey> &
    ScreenQueryOptions,
): DefinedUseQueryResult<TData, TError>;
export function useScreenQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & ScreenQueryOptions,
): UseQueryResult<TData, TError>;
export function useScreenQuery(options: UseQueryOptions & ScreenQueryOptions): UseQueryResult {
  const result = useQuery(usePausedWhileHidden(options));
  useRefetchOnReappear([options.queryKey]);
  return result;
}

/** `useInfiniteQuery` that pauses while its screen is hidden, like `useScreenQuery`. */
export function useScreenInfiniteQuery<
  TQueryFnData,
  TError = DefaultError,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>(
  options: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> &
    ScreenQueryOptions,
): UseInfiniteQueryResult<TData, TError> {
  const result = useInfiniteQuery(usePausedWhileHidden(options));
  useRefetchOnReappear([options.queryKey]);
  return result;
}

interface LooseQueriesOptions {
  queries: ReadonlyArray<UseQueryOptions & ScreenQueryOptions>;
  combine?: unknown;
}

const looseUseQueries = useQueries as unknown as (
  options: LooseQueriesOptions,
  queryClient?: QueryClient,
) => unknown;

/**
 * `useQueries` that pauses while its screen is hidden, like `useScreenQuery`.
 * Each query can set `refreshWhileHidden`.
 */
export const useScreenQueries = ((options: LooseQueriesOptions, queryClient?: QueryClient) => {
  const visible = useIsScreenVisible();
  const queries = options.queries.map((query) => pausedWhileHidden(query, visible));
  const result = looseUseQueries({ ...options, queries }, queryClient);
  useRefetchOnReappear(queries.map((query) => query.queryKey));
  return result;
}) as unknown as typeof useQueries;

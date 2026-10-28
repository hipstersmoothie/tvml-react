import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage, useNavigation } from "tvml-react";

import { poster, tvmaze, type Image, type Show } from "./api";
import { ShowDetail } from "./ShowDetail";

export function Loading({ title = "Loading…" }: { title?: string }) {
  return (
    <loadingTemplate theme="dark">
      <activityIndicator>
        <title>{title}</title>
      </activityIndicator>
    </loadingTemplate>
  );
}

/** The parts of a useQuery result (or a combined useQueries result) QueryFallback needs. */
export interface QueryStatus {
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => unknown;
}

/**
 * What a screen shows before its query has data: the error alert (Try Again
 * refetches) once it has failed, otherwise the loading spinner.
 */
export function QueryFallback({ query, title }: { query: QueryStatus; title?: string }) {
  if (query.isError && !query.isFetching) {
    return (
      <alertTemplate theme="dark">
        <title>Couldn’t load from TVMaze</title>
        <description>{query.error?.message}</description>
        <button onSelect={() => query.refetch()}>
          <text>Try Again</text>
        </button>
      </alertTemplate>
    );
  }
  return <Loading title={title} />;
}

export const POSTER = { width: 250, height: 352 };

let prefetchTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * A poster lockup that opens the show's detail screen. Resting on a poster
 * prefetches the show (cast and seasons), so the detail screen usually opens
 * complete. The delay keeps scrolling through a shelf from firing a request
 * per poster.
 */
export function ShowLockup({ show, subtitle }: { show: ShowSummary; subtitle?: string }) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const prefetch = () => {
    clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(() => queryClient.prefetchQuery(tvmaze.show(show.id)), 400);
  };
  return (
    <lockup onHighlight={prefetch} onSelect={() => navigation.push(<ShowDetail show={show} />)}>
      <img src={poster(show.image) ?? "resource://button-more"} {...POSTER} />
      <title>{show.name}</title>
      {subtitle ? <subtitle>{subtitle}</subtitle> : null}
    </lockup>
  );
}

// Watchlist -------------------------------------------------------------------

/** Just enough of a show to draw its poster and open its detail screen. */
export type ShowSummary = Pick<Show, "id" | "name" | "image"> & Partial<Show>;

function summarize(show: ShowSummary): ShowSummary {
  const image: Image | null = show.image ? { medium: show.image.medium, original: show.image.original } : null;
  return { id: show.id, name: show.name, image };
}

/**
 * Saved shows, in TVJS localStorage. useLocalStorage keeps every component that
 * reads the key in sync, across tabs and pushed screens.
 */
export function useWatchlist() {
  const [shows, setShows] = useLocalStorage<Array<ShowSummary>>("watchlist", []);
  return {
    shows,
    has: (id: number) => shows.some((s) => s.id === id),
    toggle: (show: ShowSummary) =>
      setShows((current) =>
        current.some((s) => s.id === show.id)
          ? current.filter((s) => s.id !== show.id)
          : [summarize(show), ...current],
      ),
  };
}

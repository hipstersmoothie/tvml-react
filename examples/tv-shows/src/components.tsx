import { useLocalStorage, useNavigation } from "tvml-react";

import { poster, type Image, type Show } from "./api";
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

export function ErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <alertTemplate theme="dark">
      <title>Couldn’t load from TVMaze</title>
      <description>{error.message}</description>
      <button onSelect={retry}>
        <text>Try Again</text>
      </button>
    </alertTemplate>
  );
}

export const POSTER = { width: 250, height: 352 };

/** A poster lockup that opens the show's detail screen. */
export function ShowLockup({ show, subtitle }: { show: ShowSummary; subtitle?: string }) {
  const navigation = useNavigation();
  return (
    <lockup onSelect={() => navigation.push(<ShowDetail show={show} />)}>
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

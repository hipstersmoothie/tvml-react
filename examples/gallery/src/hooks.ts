import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDisplay, useLocalStorage } from "tvml-react";

import {
  getArtwork,
  hasKnownSize,
  imageUrl,
  searchArtworks,
  type Artwork,
  type ArtworkDetail,
  type ArtworkQuery,
  type Fit,
} from "./api";

// ---------------------------------------------------------------------------
// Data

export type Status = "loading" | "ready" | "error";

export interface Paged {
  items: Array<Artwork>;
  total: number;
  status: Status;
  error?: string;
  /** Whether another page exists. */
  hasMore: boolean;
  /** Fetch the next page, unless one is already on its way. */
  loadMore(): void;
  retry(): void;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Infinite list of artworks for `query`. Call `loadMore` as the user nears the
 * end of what's loaded (from a lockup's onHighlight).
 */
export function usePagedArtworks(query: ArtworkQuery, { enabled = true } = {}): Paged {
  const key = JSON.stringify(query);
  const [state, setState] = useState<{
    key: string;
    items: Array<Artwork>;
    page: number;
    total: number;
    totalPages: number;
    status: Status;
    error?: string;
  }>({ key, items: [], page: 0, total: 0, totalPages: 1, status: "loading" });
  const inFlight = useRef<AbortController | null>(null);

  // A new query starts over.
  if (state.key !== key) {
    setState({ key, items: [], page: 0, total: 0, totalPages: 1, status: "loading" });
  }

  const fetchPage = useCallback(
    (page: number) => {
      if (inFlight.current) return;
      const controller = new AbortController();
      inFlight.current = controller;
      setState((s) => (s.status === "loading" ? s : { ...s, status: "loading" }));
      searchArtworks(JSON.parse(key) as ArtworkQuery, page, controller.signal).then(
        (result) => {
          // Aborted: the query changed or the screen went away.
          if (controller.signal.aborted) return;
          inFlight.current = null;
          setState((s) => {
            if (s.key !== key) return s;
            // The API can repeat an artwork across pages when scores tie.
            const seen = new Set(s.items.map((a) => a.id));
            return {
              ...s,
              items: [...s.items, ...result.items.filter((a) => !seen.has(a.id))],
              page,
              total: result.total,
              totalPages: result.totalPages,
              status: "ready",
              error: undefined,
            };
          });
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          inFlight.current = null;
          setState((s) => (s.key === key ? { ...s, status: "error", error: message(error) } : s));
        },
      );
    },
    [key],
  );

  useEffect(() => {
    if (!enabled) return;
    fetchPage(1);
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [enabled, fetchPage]);

  const hasMore = state.page < state.totalPages;
  const loadMore = useCallback(() => {
    if (hasMore && state.status !== "error") fetchPage(state.page + 1);
  }, [fetchPage, hasMore, state.page, state.status]);
  const retry = useCallback(() => fetchPage(state.page + 1), [fetchPage, state.page]);

  return {
    items: state.items,
    total: state.total,
    status: state.status,
    error: state.error,
    hasMore,
    loadMore,
    retry,
  };
}

export function useArtwork(id: number): {
  artwork?: ArtworkDetail;
  status: Status;
  error?: string;
} {
  const [state, setState] = useState<{ id: number; artwork?: ArtworkDetail; error?: string }>({ id });
  useEffect(() => {
    const controller = new AbortController();
    getArtwork(id, controller.signal).then(
      (artwork) => controller.signal.aborted || setState({ id, artwork }),
      (error: unknown) => controller.signal.aborted || setState({ id, error: message(error) }),
    );
    return () => controller.abort();
  }, [id]);

  const current = state.id === id ? state : { id };
  return {
    artwork: current.artwork,
    error: current.error,
    status: current.artwork ? "ready" : current.error ? "error" : "loading",
  };
}

// ---------------------------------------------------------------------------
// Favorites, persisted in TVJS localStorage

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<Array<Artwork>>("gallery.favorites", []);
  const ids = useMemo(() => new Set(favorites.map((a) => a.id)), [favorites]);

  const toggle = useCallback(
    (artwork: Artwork) =>
      setFavorites((current) => {
        if (current.some((a) => a.id === artwork.id)) {
          return current.filter((a) => a.id !== artwork.id);
        }
        // Store only the list fields, newest first.
        const { id, title, artist, date, imageId, width, height, alt, department } = artwork;
        return [{ id, title, artist, date, imageId, width, height, alt, department }, ...current];
      }),
    [setFavorites],
  );

  return { favorites, isFavorite: (id: number) => ids.has(id), toggle };
}

// ---------------------------------------------------------------------------
// Images sized for the display

/**
 * `src` and `srcset` for an artwork drawn in a `width`×`height` point box.
 * TVMLKit picks the `2x` candidate on a 4K display; `src` is the fallback
 * and uses the display scale from the native bridge. Artworks of unknown size
 * only get a `src` (their URLs contain a comma, which `srcset` can't hold).
 */
export function useArtworkImage(
  artwork: Pick<Artwork, "imageId" | "width" | "height">,
  width: number,
  height: number,
  fit: Fit = "contain",
): { src: string; srcset?: { "1x": string; "2x": string } } {
  const scale = useScreenScale();
  const at = (s: number) => imageUrl(artwork, width * s, height * s, fit);
  return {
    src: at(scale),
    srcset: hasKnownSize(artwork) ? { "1x": at(1), "2x": at(2) } : undefined,
  };
}

/** Pixel scale to request full-screen images at (1 on 1080p, 2 on 4K). */
export function useScreenScale(): number {
  const { scale, nativeScale } = useDisplay();
  return Math.min(Math.max(scale, nativeScale, 1), 2);
}

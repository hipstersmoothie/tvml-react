import { useCallback, useMemo } from "react";
import { useDisplay, useLocalStorage } from "tvml-react";

import { hasKnownSize, imageUrl, type Artwork, type Fit } from "./api";

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

import { useLocalStorage } from "tvml-react";

import type { Photo } from "./api";

/** Favorite photos, saved on the Apple TV. */
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<Array<Photo>>("favorites", []);

  const isFavorite = (photo: Photo) => favorites.some((f) => f.id === photo.id);
  const toggle = (photo: Photo) =>
    setFavorites((current) =>
      current.some((f) => f.id === photo.id)
        ? current.filter((f) => f.id !== photo.id)
        : [...current, photo],
    );

  return { favorites, isFavorite, toggle };
}

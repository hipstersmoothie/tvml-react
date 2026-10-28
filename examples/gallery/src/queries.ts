// Server state with TanStack Query. The query options live here so every screen
// showing the same list or artwork shares one cache entry: the Collections
// preview and the department's own screen, for example.

import { infiniteQueryOptions, queryOptions, type InfiniteData } from "@tanstack/react-query";

import { getArtwork, searchArtworks, type Artwork, type ArtworkQuery, type Page } from "./api";

/** Pages of artworks for a search, a department or an artist, flattened for a grid. */
export const artworkPagesQuery = (query: ArtworkQuery) =>
  infiniteQueryOptions({
    queryKey: ["artworks", "search", query],
    queryFn: ({ pageParam, signal }) => searchArtworks(query, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Page, _pages, lastPageParam: number) =>
      lastPageParam < lastPage.totalPages ? lastPageParam + 1 : undefined,
    select: flattenPages,
  });

export const artworkQuery = (id: number) =>
  queryOptions({
    queryKey: ["artworks", "detail", id],
    queryFn: ({ signal }) => getArtwork(id, signal),
  });

// Defined once, outside the options, so TanStack Query reuses the result until
// a page arrives. The grid's memoized cells rely on `items` keeping its
// artwork objects across renders.
function flattenPages(data: InfiniteData<Page, number>): { items: Array<Artwork>; total: number } {
  // The API can repeat an artwork across pages when scores tie.
  const seen = new Set<number>();
  const items: Array<Artwork> = [];
  for (const page of data.pages) {
    for (const artwork of page.items) {
      if (!seen.has(artwork.id)) {
        seen.add(artwork.id);
        items.push(artwork);
      }
    }
  }
  return { items, total: data.pages.at(-1)?.total ?? 0 };
}

/**
 * A grid's `onEndReached`: fetch the next page. Every highlight near the end
 * calls this, so `cancelRefetch: false` reuses a page that's already on its
 * way instead of restarting it. Placeholder results (a previous search) never
 * page.
 */
export function loadNextPage(pages: {
  hasNextPage: boolean;
  isPlaceholderData: boolean;
  fetchNextPage(options: { cancelRefetch: boolean }): Promise<unknown>;
}): void {
  if (pages.hasNextPage && !pages.isPlaceholderData) {
    void pages.fetchNextPage({ cancelRefetch: false });
  }
}

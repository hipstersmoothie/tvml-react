import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useScreenInfiniteQuery } from "tvml-react/query";

import { ArtworkGrid } from "../components/ArtworkGrid";
import { artworkPagesQuery, loadNextPage } from "../queries";

const SUGGESTIONS = ["Monet", "Hokusai", "Van Gogh", "Cats", "Ocean", "Night"];

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function SearchScreen() {
  const [text, setText] = useState("");
  const query = useDebounced(text.trim(), 400);
  const searching = query.length > 1;
  // keepPreviousData: the last results stay up while the next search loads.
  const results = useScreenInfiniteQuery({
    ...artworkPagesQuery({ q: query }),
    enabled: searching,
    placeholderData: keepPreviousData,
  });
  const items = results.data?.items ?? [];

  const heading = !searching
    ? `Try ${SUGGESTIONS.join(", ")}`
    : results.isError
      ? results.error.message
      : results.isPlaceholderData || results.isPending
        ? `Searching for “${query}”…`
        : items.length === 0
          ? `No results for “${query}”`
          : `Results for “${query}”`;

  return (
    <searchTemplate theme="dark">
      <searchField onTextChange={setText} />
      <collectionList>
        {searching && items.length > 0 ? (
          <ArtworkGrid title={heading} items={items} onEndReached={() => loadNextPage(results)} />
        ) : (
          <grid>
            <header>
              <title>{heading}</title>
            </header>
            <section />
          </grid>
        )}
      </collectionList>
    </searchTemplate>
  );
}

import { useEffect, useState } from "react";

import { ArtworkGrid } from "../components/ArtworkGrid";
import { usePagedArtworks } from "../hooks";

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
  const paged = usePagedArtworks({ q: query }, { enabled: query.length > 1 });

  const heading =
    query.length < 2
      ? `Try ${SUGGESTIONS.join(", ")}`
      : paged.status === "error"
        ? (paged.error ?? "Search failed")
        : paged.items.length === 0
          ? paged.status === "loading"
            ? "Searching…"
            : `No results for “${query}”`
          : `Results for “${query}”`;

  return (
    <searchTemplate theme="dark">
      <searchField onTextChange={setText} />
      <collectionList>
        {query.length > 1 && paged.items.length > 0 ? (
          <ArtworkGrid title={heading} items={paged.items} onEndReached={paged.loadMore} />
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

import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useScreenQuery } from "tvml-react/query";

import { PodcastLockup } from "./components";
import { chartQuery, searchQuery } from "./queries";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function Search() {
  const [text, setText] = useState("");
  const typed = text.trim();
  // Search 400 ms after the last keystroke. Every term is its own query, so a
  // slow response for an old term can't replace newer results, and TanStack
  // Query cancels the request for a term nobody's waiting for any more.
  const term = useDebouncedValue(typed, 400);
  const results = useScreenQuery({
    ...searchQuery(term),
    // Keep the last results on screen while the next ones load, so the grid
    // (and focus) doesn't empty out on every keystroke.
    placeholderData: keepPreviousData,
  });
  const popular = useScreenQuery(chartQuery());

  let heading: string;
  let podcasts = (term && results.data) || [];
  if (!typed) {
    heading = "Popular Shows";
    podcasts = popular.data ?? [];
  } else if (typed !== term || results.isPending || results.isPlaceholderData) {
    heading = `Searching for “${typed}”…`;
  } else if (results.isError) {
    heading = results.error.message;
  } else if (podcasts.length === 0) {
    heading = `No shows found for “${term}”`;
  } else {
    heading = `Shows matching “${term}”`;
  }

  return (
    <searchTemplate theme="dark">
      <searchField onTextChange={setText} />
      <collectionList>
        <grid>
          <header>
            <title>{heading}</title>
          </header>
          <section>
            {podcasts.map((podcast) => (
              <PodcastLockup key={podcast.id} podcast={podcast} size={250} />
            ))}
          </section>
        </grid>
      </collectionList>
    </searchTemplate>
  );
}

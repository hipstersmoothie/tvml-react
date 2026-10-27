import { useEffect, useState } from "react";

import { searchPodcasts, topPodcasts } from "./api";
import { PodcastLockup } from "./components";
import { useResource } from "./useResource";

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
  const query = useDebouncedValue(text.trim(), 400);
  const [results] = useResource(query ? `search:${query.toLowerCase()}` : null, (token) =>
    searchPodcasts(query, token),
  );
  const [top] = useResource("top:all", (token) => topPodcasts(undefined, token));

  const typed = text.trim();
  let heading: string;
  let podcasts = results.data ?? [];
  if (!typed) {
    heading = "Popular Shows";
    podcasts = top.data ?? [];
  } else if (typed !== query || results.status === "loading") {
    heading = `Searching for “${typed}”…`;
    podcasts = [];
  } else if (results.status === "error") {
    heading = results.error.message;
  } else if (podcasts.length === 0) {
    heading = `No shows found for “${query}”`;
  } else {
    heading = `Shows matching “${query}”`;
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

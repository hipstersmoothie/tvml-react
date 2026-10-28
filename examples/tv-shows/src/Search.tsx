import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useScreenQuery } from "tvml-react/query";

import { channel, tvmaze, years, type SearchResult, type Show } from "./api";
import { ShowLockup } from "./components";

// TanStack Query doesn't debounce: wait for typing to pause before the query
// key changes, so each keystroke isn't a request.
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const toShows = (results: Array<SearchResult>) => results.map((result) => result.show);
const toTrending = (page: Array<Show>) =>
  page.filter((show) => show.image).sort((a, b) => b.weight - a.weight).slice(0, 12);

export function Search() {
  const [text, setText] = useState("");
  const query = useDebounced(text.trim(), 350);
  // While the next query loads, keep showing the previous query's results.
  const results = useScreenQuery({
    ...tvmaze.search(query),
    enabled: query !== "",
    select: toShows,
    placeholderData: keepPreviousData,
  });
  // Shown before anything is typed. The same query as the Popular tab's first page.
  const trending = useScreenQuery({ ...tvmaze.shows(0), select: toTrending });

  return (
    <searchTemplate theme="dark">
      <searchField onTextChange={setText}>
        <placeholder>Shows, e.g. “Severance”</placeholder>
      </searchField>
      <collectionList>
        {query ? <Results query={query} results={results} /> : <Trending shows={trending.data} />}
      </collectionList>
    </searchTemplate>
  );
}

function Results({ query, results }: { query: string; results: UseQueryResult<Array<Show>> }) {
  const shows = results.data;
  if (shows === undefined || (results.isError && !results.isFetching)) {
    return (
      <separator>
        <title>{results.isError && !results.isFetching ? results.error.message : `Searching for “${query}”…`}</title>
      </separator>
    );
  }
  if (shows.length === 0 && !results.isPlaceholderData) {
    return (
      <separator>
        <title>{`No shows match “${query}”`}</title>
      </separator>
    );
  }
  return (
    <grid>
      <header>
        <title>{results.isPlaceholderData ? "Searching…" : `${shows.length} results for “${query}”`}</title>
      </header>
      <section>
        {shows.map((show) => (
          <ShowLockup key={show.id} show={show} subtitle={[years(show), channel(show)].filter(Boolean).join(" · ")} />
        ))}
      </section>
    </grid>
  );
}

function Trending({ shows }: { shows: Array<Show> | undefined }) {
  if (shows === undefined) return <separator />;
  return (
    <shelf>
      <header>
        <title>Trending</title>
      </header>
      <section>
        {shows.map((show) => (
          <ShowLockup key={show.id} show={show} />
        ))}
      </section>
    </shelf>
  );
}

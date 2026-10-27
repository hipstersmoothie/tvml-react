import { useEffect, useState } from "react";

import { channel, endpoints, years, type SearchResult, type Show } from "./api";
import { ShowLockup } from "./components";
import { useApi } from "./useApi";

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const toShows = ([results]: Array<Array<SearchResult>>) => results.map((result) => result.show);
const toTrending = ([page]: Array<Array<Show>>) =>
  page.filter((show) => show.image).sort((a, b) => b.weight - a.weight).slice(0, 12);

export function Search() {
  const [text, setText] = useState("");
  const query = useDebounced(text.trim(), 350);
  const results = useApi(query ? endpoints.search(query) : null, toShows);
  // Shown before anything is typed. Shares the Popular tab's cached request.
  const trending = useApi(endpoints.shows(0), toTrending);

  return (
    <searchTemplate theme="dark">
      <searchField onTextChange={setText}>
        <placeholder>Shows, e.g. “Severance”</placeholder>
      </searchField>
      <collectionList>{query ? <Results query={query} state={results} /> : <Trending state={trending} />}</collectionList>
    </searchTemplate>
  );
}

function Results({ query, state }: { query: string; state: ReturnType<typeof useApi<Array<Show>>> }) {
  if (state.status !== "ready") {
    return (
      <separator>
        <title>{state.status === "error" ? state.error.message : `Searching for “${query}”…`}</title>
      </separator>
    );
  }
  if (state.data.length === 0) {
    return (
      <separator>
        <title>{`No shows match “${query}”`}</title>
      </separator>
    );
  }
  return (
    <grid>
      <header>
        <title>{`${state.data.length} results for “${query}”`}</title>
      </header>
      <section>
        {state.data.map((show) => (
          <ShowLockup key={show.id} show={show} subtitle={[years(show), channel(show)].filter(Boolean).join(" · ")} />
        ))}
      </section>
    </grid>
  );
}

function Trending({ state }: { state: ReturnType<typeof useApi<Array<Show>>> }) {
  if (state.status !== "ready") return <separator />;
  return (
    <shelf>
      <header>
        <title>Trending</title>
      </header>
      <section>
        {state.data.map((show) => (
          <ShowLockup key={show.id} show={show} />
        ))}
      </section>
    </shelf>
  );
}

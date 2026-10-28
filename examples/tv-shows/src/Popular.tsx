import type { UseQueryResult } from "@tanstack/react-query";
import { useScreenQueries } from "tvml-react/query";

import { tvmaze, years, type Show } from "./api";
import { QueryFallback, ShowLockup } from "./components";

const PAGES = [0, 1, 2];
const GENRES = ["Drama", "Comedy", "Crime", "Science-Fiction", "Action", "Thriller", "Fantasy", "Romance", "Horror", "Family"];
const PER_CATEGORY = 30;

interface Category {
  title: string;
  shows: Array<Show>;
}

const byRating = (a: Show, b: Show) => (b.rating.average ?? 0) - (a.rating.average ?? 0);

// TVMaze's /shows index is ordered by id; `weight` is its popularity score.
function toCategories(pages: Array<Array<Show>>): Array<Category> {
  const shows = pages.flat().filter((show) => show.image && show.rating.average != null);
  const popular = [...shows].sort((a, b) => b.weight - a.weight || byRating(a, b));
  return [
    { title: "Most Popular", shows: popular.slice(0, PER_CATEGORY) },
    { title: "Top Rated", shows: [...shows].sort(byRating).slice(0, PER_CATEGORY) },
    ...GENRES.map((genre) => ({
      title: genre,
      shows: popular.filter((show) => show.genres.includes(genre)).slice(0, PER_CATEGORY),
    })),
  ].filter((category) => category.shows.length > 0);
}

// Three /shows pages, each its own query (Search's Trending shelf shares page
// 0), combined into one result for the screen.
function combinePages(pages: Array<UseQueryResult<Array<Show>>>) {
  const failed = pages.find((page) => page.isError);
  return {
    categories: pages.every((page) => page.data) ? toCategories(pages.map((page) => page.data!)) : undefined,
    isFetching: pages.some((page) => page.isFetching),
    isError: failed !== undefined,
    error: failed?.error ?? null,
    refetch: () => Promise.all(pages.filter((page) => page.isError).map((page) => page.refetch())),
  };
}

export function Popular() {
  const catalog = useScreenQueries({ queries: PAGES.map(tvmaze.shows), combine: combinePages });

  if (catalog.categories === undefined) {
    return <QueryFallback query={catalog} title="Loading popular shows…" />;
  }

  return (
    <catalogTemplate theme="dark">
      <list>
        <section>
          {catalog.categories.map((category) => (
            <listItemLockup key={category.title}>
              <title>{category.title}</title>
              <decorationLabel>{String(category.shows.length)}</decorationLabel>
              <relatedContent>
                <grid>
                  <section>
                    {category.shows.map((show) => (
                      <ShowLockup
                        key={show.id}
                        show={show}
                        subtitle={`★ ${show.rating.average?.toFixed(1)} · ${years(show)}`}
                      />
                    ))}
                  </section>
                </grid>
              </relatedContent>
            </listItemLockup>
          ))}
        </section>
      </list>
    </catalogTemplate>
  );
}

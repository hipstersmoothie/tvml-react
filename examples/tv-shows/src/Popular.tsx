import { endpoints, years, type Show } from "./api";
import { ErrorScreen, Loading, ShowLockup } from "./components";
import { useApi } from "./useApi";

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

export function Popular() {
  const catalog = useApi(PAGES.map(endpoints.shows), toCategories);

  if (catalog.status === "loading") return <Loading title="Loading popular shows…" />;
  if (catalog.status === "error") return <ErrorScreen {...catalog} />;

  return (
    <catalogTemplate theme="dark">
      <list>
        <section>
          {catalog.data.map((category) => (
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

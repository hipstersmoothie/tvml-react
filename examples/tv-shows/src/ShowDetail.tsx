import { useNavigation } from "tvml-react";

import { channel, endpoints, plainText, poster, year, years, type Season, type ShowDetails } from "./api";
import { ErrorScreen, useWatchlist, type ShowSummary } from "./components";
import { SeasonScreen } from "./SeasonScreen";
import { useApi } from "./useApi";

// Level 1: pushed from any poster. Renders straight away from the summary it was
// opened with, then fills in cast and seasons when the full show arrives.
export function ShowDetail({ show: summary }: { show: ShowSummary }) {
  const navigation = useNavigation();
  const watchlist = useWatchlist();
  const details = useApi<ShowDetails>(endpoints.show(summary.id));

  if (details.status === "error") return <ErrorScreen {...details} />;

  const show: ShowSummary = details.status === "ready" ? details.data : summary;
  const cast = details.status === "ready" ? details.data._embedded.cast : [];
  const seasons = details.status === "ready" ? details.data._embedded.seasons : [];
  const rating = show.rating?.average;
  const saved = watchlist.has(show.id);
  const facts = [years(show), show.runtime ? `${show.runtime} min` : "", show.language ?? ""].filter(Boolean);

  const openSeason = (index: number) => {
    const season = seasons[index];
    if (season) navigation.push(<SeasonScreen show={show} season={season} />);
  };

  return (
    <productTemplate theme="dark">
      <banner>
        <infoList>
          {channel(show) && (
            <info>
              <header>
                <title>Network</title>
              </header>
              <text>{channel(show)}</text>
            </info>
          )}
          {show.genres && show.genres.length > 0 && (
            <info>
              <header>
                <title>Genres</title>
              </header>
              {show.genres.map((genre) => (
                <text key={genre}>{genre}</text>
              ))}
            </info>
          )}
          {show.status && (
            <info>
              <header>
                <title>Status</title>
              </header>
              <text>{show.status}</text>
            </info>
          )}
        </infoList>
        <stack>
          <title>{show.name}</title>
          <row>
            {facts.map((fact) => (
              <text key={fact}>{fact}</text>
            ))}
            {show.type && <textBadge>{show.type}</textBadge>}
            {rating != null && <ratingBadge value={rating / 10} />}
            {rating != null && <text>{`${rating.toFixed(1)}/10`}</text>}
          </row>
          <description
            allowsZooming
            onSelect={() => navigation.presentModal(<Summary title={show.name} text={plainText(show.summary)} />)}
          >
            {plainText(show.summary) || "No summary yet."}
          </description>
          <row>
            <buttonLockup disabled={seasons.length === 0} onSelect={() => openSeason(latestAired(seasons))}>
              <badge src="resource://button-more" />
              <title>Episodes</title>
            </buttonLockup>
            <buttonLockup onSelect={() => watchlist.toggle(show)}>
              <badge src={saved ? "resource://button-checkmark" : "resource://button-add"} />
              <title>{saved ? "In Watchlist" : "Watchlist"}</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={show.image?.original ?? poster(show.image)} />
      </banner>
      {seasons.length > 0 && (
        <shelf>
          <header>
            <title>Seasons</title>
          </header>
          <section>
            {seasons.map((season, index) => (
              <lockup key={season.id} onSelect={() => openSeason(index)}>
                <img src={poster(season.image) ?? poster(show.image)} width={182} height={256} />
                <title>{season.name || `Season ${season.number}`}</title>
                <subtitle>{season.episodeOrder ? `${season.episodeOrder} episodes` : year(season.premiereDate)}</subtitle>
              </lockup>
            ))}
          </section>
        </shelf>
      )}
      {cast.length > 0 && (
        <shelf>
          <header>
            <title>Cast</title>
          </header>
          <section>
            {cast.slice(0, 20).map(({ person, character }) => {
              const [firstName, ...rest] = person.name.split(" ");
              return (
                <monogramLockup key={`${person.id}-${character.id}`}>
                  <monogram firstName={firstName} lastName={rest.join(" ")} src={poster(person.image)} />
                  <title>{person.name}</title>
                  <subtitle>{character.name}</subtitle>
                </monogramLockup>
              );
            })}
          </section>
        </shelf>
      )}
    </productTemplate>
  );
}

/** Index of the most recent season that has started airing. */
function latestAired(seasons: Array<Season>): number {
  const today = new Date().toISOString().slice(0, 10);
  for (let i = seasons.length - 1; i >= 0; i--) {
    const premiere = seasons[i]!.premiereDate;
    if (premiere && premiere <= today) return i;
  }
  return 0;
}

function Summary({ title, text }: { title: string; text: string }) {
  return (
    <descriptiveAlertTemplate theme="dark">
      <title>{title}</title>
      <description>{text}</description>
    </descriptiveAlertTemplate>
  );
}

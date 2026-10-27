import { useNavigation } from "tvml-react";

import { airDate, endpoints, formatDay, plainText, poster, type Episode, type Season } from "./api";
import { ErrorScreen, Loading, type ShowSummary } from "./components";
import { EpisodeDetail } from "./EpisodeDetail";
import { useApi } from "./useApi";

// Level 2: a season's episodes. Highlighting a row previews the episode on the
// right (relatedContent); selecting it pushes the episode screen.
export function SeasonScreen({ show, season }: { show: ShowSummary; season: Season }) {
  const navigation = useNavigation();
  const episodes = useApi<Array<Episode>>(endpoints.episodes(season.id));
  const seasonTitle = season.name || `Season ${season.number}`;

  if (episodes.status === "loading") return <Loading title={`${show.name} · ${seasonTitle}`} />;
  if (episodes.status === "error") return <ErrorScreen {...episodes} />;

  const list = episodes.data;
  if (list.length === 0) {
    return (
      <alertTemplate theme="dark">
        <title>{`${show.name} · ${seasonTitle}`}</title>
        <description>
          {season.premiereDate
            ? `No episodes yet. Premieres ${formatDay(season.premiereDate)}.`
            : "No episodes have been announced yet."}
        </description>
        <button onSelect={() => navigation.pop()}>
          <text>Back</text>
        </button>
      </alertTemplate>
    );
  }

  return (
    <listTemplate theme="dark">
      <banner>
        <title>{`${show.name} · ${seasonTitle}`}</title>
      </banner>
      <list>
        <header>
          <title>{`${list.length} episodes`}</title>
        </header>
        <section>
          {list.map((episode, index) => (
            <listItemLockup
              key={episode.id}
              onSelect={() => navigation.push(<EpisodeDetail show={show} episodes={list} index={index} />)}
            >
              <ordinal>{episode.number != null ? String(episode.number) : "SP"}</ordinal>
              <title>{episode.name}</title>
              <decorationLabel>{airDate(episode)}</decorationLabel>
              <relatedContent>
                <lockup>
                  <img
                    src={episode.image?.original ?? poster(season.image) ?? poster(show.image)}
                    width={857}
                    height={482}
                  />
                  <title>{episode.name}</title>
                  <description>{plainText(episode.summary) || "No summary yet."}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          ))}
        </section>
      </list>
    </listTemplate>
  );
}

import { useNavigation } from "tvml-react";

import { airDate, episodeCode, plainText, poster, type Episode } from "./api";
import type { ShowSummary } from "./components";

// Level 3: one episode. "Next Episode" swaps this screen in place with
// navigation.replace(), so Menu still goes straight back to the season list.
export function EpisodeDetail({
  show,
  episodes,
  index,
}: {
  show: ShowSummary;
  episodes: Array<Episode>;
  index: number;
}) {
  const navigation = useNavigation();
  const episode = episodes[index]!;
  const next = episodes[index + 1];
  const rating = episode.rating.average;
  const facts = [show.name, episodeCode(episode), airDate(episode), episode.runtime ? `${episode.runtime} min` : ""].filter(Boolean);

  return (
    <productTemplate theme="dark">
      <banner>
        <stack>
          <title>{episode.name}</title>
          <row>
            {facts.map((fact) => (
              <text key={fact}>{fact}</text>
            ))}
            {rating != null && <ratingBadge value={rating / 10} />}
            {rating != null && <text>{`${rating.toFixed(1)}/10`}</text>}
          </row>
          <description allowsZooming>{plainText(episode.summary) || "No summary yet."}</description>
          <row>
            {next && (
              <buttonLockup
                onSelect={() => navigation.replace(<EpisodeDetail show={show} episodes={episodes} index={index + 1} />)}
              >
                <badge src="resource://button-play" />
                <title>Next Episode</title>
              </buttonLockup>
            )}
            <buttonLockup onSelect={() => navigation.pop()}>
              <badge src="resource://button-more" />
              <title>All Episodes</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={episode.image?.original ?? poster(show.image)} />
      </banner>
    </productTemplate>
  );
}

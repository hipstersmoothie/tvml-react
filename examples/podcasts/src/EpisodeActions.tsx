// Long-press menu for an episode, presented modally.

import { useNavigation } from "tvml-react";

import { useProgress } from "./library";
import { usePodcastPlayer } from "./PlayerProvider";
import { PodcastDetail } from "./PodcastDetail";
import type { Episode, Podcast } from "./types";

export function EpisodeActions({
  episode,
  podcast,
  showPodcastLink = false,
}: {
  episode: Episode;
  podcast: Podcast;
  showPodcastLink?: boolean;
}) {
  const navigation = useNavigation();
  const { playEpisode } = usePodcastPlayer();
  const { progress, save, clear } = useProgress();
  const saved = progress[episode.id];
  const played = saved?.played ?? false;

  const then = (action: () => void) => () => {
    navigation.dismissModal();
    action();
  };

  return (
    <alertTemplate theme="dark">
      <title>{episode.title}</title>
      <description>{podcast.title}</description>
      <button onSelect={then(() => playEpisode(episode, podcast, { fromStart: true }))}>
        <text>Play from Beginning</text>
      </button>
      <button
        onSelect={then(() =>
          played ? clear(episode.id) : save(episode, podcast, { played: true, position: 0 }),
        )}
      >
        <text>{played ? "Mark as Unplayed" : "Mark as Played"}</text>
      </button>
      {showPodcastLink ? (
        <button onSelect={then(() => navigation.push(<PodcastDetail podcast={podcast} />))}>
          <text>Go to Show</text>
        </button>
      ) : null}
      <button onSelect={() => navigation.dismissModal()}>
        <text>Cancel</text>
      </button>
    </alertTemplate>
  );
}

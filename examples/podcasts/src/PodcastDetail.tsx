import { useState } from "react";
import { useNavigation } from "tvml-react";

import { loadFeed } from "./api";
import { ErrorScreen, LoadingScreen } from "./components";
import { EpisodeActions } from "./EpisodeActions";
import { formatLength, formatPublished, formatRemaining } from "./format";
import { useProgress, useSubscriptions } from "./library";
import { usePodcastPlayer } from "./PlayerProvider";
import type { Episode, Podcast, Progress } from "./types";
import { useResource } from "./useResource";

const PAGE = 40;

export function PodcastDetail({ podcast }: { podcast: Podcast }) {
  const [feed, reload] = useResource(`feed:${podcast.id}`, (signal) => loadFeed(podcast, signal));
  const [visible, setVisible] = useState(PAGE);
  const { isSubscribed, toggle } = useSubscriptions();
  const { progress } = useProgress();
  const { playEpisode } = usePodcastPlayer();

  if (feed.status === "loading") return <LoadingScreen title={podcast.title} />;
  if (feed.status === "error") return <ErrorScreen error={feed.error} onRetry={reload} />;

  const { episodes, description } = feed.data;
  const subscribed = isSubscribed(podcast.id);
  const latest = episodes[0];
  // The newest episode the user is partway through, else the latest one.
  const resume = episodes.find((e) => {
    const p = progress[e.id];
    return p && !p.played && p.position > 0;
  });
  const resumeProgress = resume && progress[resume.id];
  const next = resume ?? latest;

  return (
    <listTemplate theme="dark">
      <banner>
        <title>{podcast.title}</title>
      </banner>
      <list>
        <section>
          <header>
            <title>{podcast.author}</title>
          </header>
          {next ? (
            <listItemLockup onSelect={() => playEpisode(next, podcast)}>
              <title>{resume ? "Resume" : "Play Latest Episode"}</title>
              <decorationLabel>
                {resumeProgress
                  ? formatRemaining(resumeProgress.position, resumeProgress.duration)
                  : formatPublished(next.published)}
              </decorationLabel>
              <EpisodeInfo episode={next} podcast={podcast} />
            </listItemLockup>
          ) : null}
          <listItemLockup onSelect={() => toggle(podcast)}>
            <title>{subscribed ? "Subscribed" : "Subscribe"}</title>
            <decorationImage src={subscribed ? "resource://button-checkmark" : "resource://button-add"} />
            <relatedContent>
              <lockup>
                <img src={podcast.artwork} width={500} height={500} />
                <title>{podcast.title}</title>
                <description>{description}</description>
              </lockup>
            </relatedContent>
          </listItemLockup>
        </section>
        <section>
          <header>
            <title>{`${episodes.length} Episodes`}</title>
          </header>
          {episodes.slice(0, visible).map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              podcast={podcast}
              progress={progress[episode.id]}
            />
          ))}
          {visible < episodes.length ? (
            <listItemLockup onSelect={() => setVisible((n) => n + PAGE)}>
              <title>Show More Episodes</title>
              <decorationLabel>{`${episodes.length - visible} more`}</decorationLabel>
            </listItemLockup>
          ) : null}
        </section>
      </list>
    </listTemplate>
  );
}

function EpisodeRow({
  episode,
  podcast,
  progress,
}: {
  episode: Episode;
  podcast: Podcast;
  progress: Progress | undefined;
}) {
  const navigation = useNavigation();
  const { playEpisode } = usePodcastPlayer();

  let status = formatLength(episode.duration);
  if (progress?.played) status = "Played";
  else if (progress && progress.position > 0) {
    status = formatRemaining(progress.position, progress.duration || episode.duration);
  }

  return (
    <listItemLockup
      onSelect={() => playEpisode(episode, podcast)}
      onPlay={() => playEpisode(episode, podcast)}
      onHoldSelect={() =>
        navigation.presentModal(<EpisodeActions episode={episode} podcast={podcast} />)
      }
    >
      <title>{episode.title}</title>
      <subtitle>{formatPublished(episode.published)}</subtitle>
      <decorationLabel>{status}</decorationLabel>
      <EpisodeInfo episode={episode} podcast={podcast} />
    </listItemLockup>
  );
}

function EpisodeInfo({ episode, podcast }: { episode: Episode; podcast: Podcast }) {
  const meta = [
    episode.season ? `Season ${episode.season}` : "",
    episode.number ? `Episode ${episode.number}` : "",
    formatPublished(episode.published),
    formatLength(episode.duration),
  ].filter(Boolean);
  return (
    <relatedContent>
      <lockup>
        <img src={episode.artwork || podcast.artwork} width={500} height={500} />
        <title>{episode.title}</title>
        <subtitle>{meta.join(" · ")}</subtitle>
        <description>{episode.description}</description>
      </lockup>
    </relatedContent>
  );
}

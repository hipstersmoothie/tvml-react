import { useNavigation } from "tvml-react";
import { useScreenQuery } from "tvml-react/query";

import { PodcastLockup } from "./components";
import { EpisodeActions } from "./EpisodeActions";
import { formatRemaining } from "./format";
import { useProgress, useSubscriptions } from "./library";
import { usePodcastPlayer } from "./PlayerProvider";
import { chartQuery } from "./queries";

const GENRES: Array<{ id: number; name: string }> = [
  { id: 1489, name: "News" },
  { id: 1303, name: "Comedy" },
  { id: 1488, name: "True Crime" },
  { id: 1487, name: "History" },
  { id: 1318, name: "Technology" },
];

export function Home() {
  const { subscriptions } = useSubscriptions();

  return (
    <stackTemplate theme="dark">
      <collectionList>
        <ContinueListening />
        {subscriptions.length > 0 ? (
          <shelf>
            <header>
              <title>Your Shows</title>
            </header>
            <section>
              {subscriptions.map((podcast) => (
                <PodcastLockup key={podcast.id} podcast={podcast} />
              ))}
            </section>
          </shelf>
        ) : null}
        <ChartShelf title="Top Shows" />
        {GENRES.map((genre) => (
          <ChartShelf key={genre.id} title={`Top in ${genre.name}`} genreId={genre.id} />
        ))}
      </collectionList>
    </stackTemplate>
  );
}

function ContinueListening() {
  const navigation = useNavigation();
  const { inProgress } = useProgress();
  const { playEpisode } = usePodcastPlayer();
  if (inProgress.length === 0) return null;

  return (
    <shelf>
      <header>
        <title>Continue Listening</title>
      </header>
      <section>
        {inProgress.slice(0, 12).map(({ episode, podcast, position, duration }) => (
          <lockup
            key={episode.id}
            onSelect={() => playEpisode(episode, podcast)}
            onPlay={() => playEpisode(episode, podcast)}
            onHoldSelect={() =>
              navigation.presentModal(
                <EpisodeActions episode={episode} podcast={podcast} showPodcastLink />,
              )
            }
          >
            <img src={episode.artwork || podcast.artwork} width={300} height={300} />
            <title>{episode.title}</title>
            <subtitle>{formatRemaining(position, duration) || podcast.title}</subtitle>
            {duration > 0 ? (
              <overlay>
                <progressBar value={Math.min(1, position / duration)} />
              </overlay>
            ) : null}
          </lockup>
        ))}
      </section>
    </shelf>
  );
}

function ChartShelf({ title, genreId }: { title: string; genreId?: number }) {
  // Each shelf loads on its own and stays hidden until it has shows.
  const { data: podcasts } = useScreenQuery(chartQuery(genreId));
  if (!podcasts?.length) return null;

  return (
    <shelf>
      <header>
        <title>{title}</title>
      </header>
      <section>
        {podcasts.map((podcast) => (
          <PodcastLockup key={podcast.id} podcast={podcast} />
        ))}
      </section>
    </shelf>
  );
}

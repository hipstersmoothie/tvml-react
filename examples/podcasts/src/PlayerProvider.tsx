// One player for the whole app. usePlayer() owns a TVJS Player per calling
// component (and stops it when that component unmounts), so it lives here, in
// the `wrapper` passed to launch(), where it outlives every pushed screen.
// Screens get stable actions through context; the once-a-second time updates
// stay inside this component.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePlayer } from "tvml-react";

import { useProgress } from "./library";
import { NowPlayingOverlay } from "./NowPlayingOverlay";
import type { Episode, Podcast } from "./types";

interface PlayerActions {
  /** Play an episode, resuming where the user left off unless `fromStart`. */
  playEpisode(episode: Episode, podcast: Podcast, options?: { fromStart?: boolean }): void;
}

const PlayerContext = createContext<PlayerActions | null>(null);

export function usePodcastPlayer(): PlayerActions {
  const actions = useContext(PlayerContext);
  if (!actions) throw new Error("usePodcastPlayer must be used inside <PlayerProvider>");
  return actions;
}

// Within this many seconds of the end counts as finished.
const FINISHED_MARGIN = 30;
// How often (in media seconds) to persist the position while playing, so a
// crash or force-quit loses little. Pausing and stopping save right away.
const SAVE_EVERY = 15;
const FINISHED = -1;

// `play` counts calls to playEpisode; see the overlay below.
type NowPlaying = { episode: Episode; podcast: Podcast; play: number };

export function PlayerProvider({ children }: { children?: ReactNode }) {
  const player = usePlayer();
  const { progress, save } = useProgress();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const lastSaved = useRef(0);

  // Read the latest progress without making playEpisode change identity.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const playEpisode = useCallback<PlayerActions["playEpisode"]>(
    (episode, podcast, options = {}) => {
      const saved = progressRef.current[episode.id];
      const startTime =
        !options.fromStart && saved && !saved.played ? Math.max(0, saved.position - 5) : 0;
      setNowPlaying((current) => ({ episode, podcast, play: (current?.play ?? 0) + 1 }));
      lastSaved.current = startTime;
      save(episode, podcast, { position: startTime, played: false });
      player.play({
        url: episode.url,
        type: episode.mediaType,
        title: episode.title,
        subtitle: podcast.title,
        description: episode.description.slice(0, 400),
        artworkImageURL: episode.artwork || podcast.artwork,
        startTime,
      });
    },
    [player.play, save],
  );

  const { currentTime, duration, state, currentItem } = player;

  // Persist the playback position: every SAVE_EVERY seconds while playing, and
  // on pause and end (currentTime keeps its last value once playback stops).
  useEffect(() => {
    if (!nowPlaying || currentItem?.url !== nowPlaying.episode.url || currentTime <= 0) return;

    const known =
      Number.isFinite(duration) && duration > 0 ? duration : nowPlaying.episode.duration;
    if (known > 0 && currentTime >= known - FINISHED_MARGIN) {
      if (lastSaved.current === FINISHED) return;
      lastSaved.current = FINISHED;
      save(nowPlaying.episode, nowPlaying.podcast, { position: 0, duration: known, played: true });
      return;
    }

    const stateChange = state === "paused" || state === "end";
    if (!stateChange && Math.abs(currentTime - lastSaved.current) < SAVE_EVERY) return;
    lastSaved.current = currentTime;
    save(nowPlaying.episode, nowPlaying.podcast, { position: currentTime, duration: known });
  }, [nowPlaying, currentTime, duration, state, currentItem, save]);

  const actions = useMemo(() => ({ playEpisode }), [playEpisode]);
  return (
    <PlayerContext.Provider value={actions}>
      {children}
      {nowPlaying?.episode.mediaType === "audio" ? (
        <NowPlayingOverlay
          player={player}
          artwork={nowPlaying.episode.artwork || nowPlaying.podcast.artwork}
        />
      ) : null}
    </PlayerContext.Provider>
  );
}

// The app's playback layer, on top of tvml-react's shared <PlayerProvider>
// (one player for the whole app, set up in main.tsx's `wrapper`). Adds
// `playEpisode` (resume where the user left off) and saves listening progress:
// every SAVE_EVERY seconds, on pause, and when an episode ends for any reason.

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
import { usePlayerControls, usePlayerEvent, usePlayerState } from "tvml-react";

import { useProgress } from "./library";
import { NowPlayingOverlay } from "./NowPlayingOverlay";
import type { Episode, Podcast } from "./types";

interface PodcastPlayerActions {
  /** Play an episode, resuming where the user left off unless `fromStart`. */
  playEpisode(episode: Episode, podcast: Podcast, options?: { fromStart?: boolean }): void;
}

const PodcastPlayerContext = createContext<PodcastPlayerActions | null>(null);

export function usePodcastPlayer(): PodcastPlayerActions {
  const actions = useContext(PodcastPlayerContext);
  if (!actions) throw new Error("usePodcastPlayer must be used inside <PodcastPlayer>");
  return actions;
}

// Within this many seconds of the end counts as finished.
const FINISHED_MARGIN = 30;
// Save the position this often (in media seconds) while playing, so a crash or
// force-quit loses little.
const SAVE_EVERY = 15;

type NowPlaying = { episode: Episode; podcast: Podcast };

export function PodcastPlayer({ children }: { children?: ReactNode }) {
  const { play } = usePlayerControls();
  const { progress, save } = useProgress();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  // Read the latest progress without making playEpisode change identity.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const playEpisode = useCallback<PodcastPlayerActions["playEpisode"]>(
    (episode, podcast, options = {}) => {
      const saved = progressRef.current[episode.id];
      const startTime =
        !options.fromStart && saved && !saved.played ? Math.max(0, saved.position - 5) : 0;
      setNowPlaying({ episode, podcast });
      save(episode, podcast, { position: startTime, played: false });
      play({
        url: episode.url,
        type: episode.mediaType,
        title: episode.title,
        subtitle: podcast.title,
        description: episode.description.slice(0, 400),
        artworkImageURL: episode.artwork || podcast.artwork,
        startTime,
      });
    },
    [play, save],
  );

  const savePosition = useCallback(
    (time: number, duration: number, ended = false) => {
      if (!nowPlaying || time <= 0) return;
      const known = Number.isFinite(duration) && duration > 0 ? duration : nowPlaying.episode.duration;
      const finished = known > 0 && time >= known - FINISHED_MARGIN;
      if (finished) {
        save(nowPlaying.episode, nowPlaying.podcast, { position: 0, duration: known, played: true });
      } else if (!ended || time > 0) {
        save(nowPlaying.episode, nowPlaying.podcast, { position: time, duration: known });
      }
    },
    [nowPlaying, save],
  );

  // Periodically while playing. Selecting a SAVE_EVERY-second bucket (not the
  // time itself) means this component re-renders every 15s, not every second.
  const bucket = usePlayerState((s) =>
    s.state === "playing" ? Math.floor(s.currentTime / SAVE_EVERY) : -1,
  );
  const duration = usePlayerState((s) => s.duration);
  useEffect(() => {
    if (bucket > 0) savePosition(bucket * SAVE_EVERY, duration);
  }, [bucket]); // eslint-disable-line react-hooks/exhaustive-deps

  // On pause (the time doesn't move while paused, so this fires once).
  const pausedAt = usePlayerState((s) => (s.state === "paused" ? s.currentTime : null));
  useEffect(() => {
    if (pausedAt !== null) savePosition(pausedAt, duration);
  }, [pausedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // When it ends: played through, stopped, errored, or the user pressed Menu.
  usePlayerEvent("itemEnd", ({ time, duration: total, reason }) => {
    savePosition(reason === "playedToEnd" ? total : time, total, true);
  });

  const actions = useMemo(() => ({ playEpisode }), [playEpisode]);
  return (
    <PodcastPlayerContext.Provider value={actions}>
      {children}
      {nowPlaying?.episode.mediaType === "audio" ? (
        <NowPlayingOverlay artwork={nowPlaying.episode.artwork || nowPlaying.podcast.artwork} />
      ) : null}
    </PodcastPlayerContext.Provider>
  );
}

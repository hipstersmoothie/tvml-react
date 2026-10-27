// One player for the whole app. usePlayer() owns a TVJS Player per calling
// component (and stops it when that component unmounts), so it lives here, in
// the `wrapper` passed to launch(), where it outlives every pushed screen.
// Screens get stable actions through context; the once-a-second time updates
// stay inside this component.

import "./tvjsPlayer";

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
import { createDocument, createPortal, usePlayer } from "tvml-react";

import { useProgress } from "./library";
import { NowPlayingOverlay } from "./NowPlayingOverlay";
import { currentTVJSPlayer } from "./tvjsPlayer";
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
// How often (in media seconds) to persist the position while playing.
const SAVE_EVERY = 5;
const FINISHED = -1;

type NowPlaying = { episode: Episode; podcast: Podcast };

export function PlayerProvider({ children }: { children?: ReactNode }) {
  const player = usePlayer();
  const { progress, save } = useProgress();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const lastSaved = useRef(0);
  const pendingSeek = useRef(0);
  const [overlay] = useState(createDocument);

  // Read the latest progress without making playEpisode change identity.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const playEpisode = useCallback<PlayerActions["playEpisode"]>(
    (episode, podcast, options = {}) => {
      const saved = progressRef.current[episode.id];
      const resumeAt =
        !options.fromStart && saved && !saved.played ? Math.max(0, saved.position - 5) : 0;
      setNowPlaying({ episode, podcast });
      lastSaved.current = resumeAt;
      // MediaItem.resumeTime makes TVMLKit ask "Resume Playback / Start from
      // Beginning" and wait. Podcasts just resume, so seek once playing.
      pendingSeek.current = resumeAt;
      save(episode, podcast, { position: resumeAt, played: false });
      player.play({
        url: episode.url,
        type: episode.mediaType,
        title: episode.title,
        subtitle: podcast.title,
        description: episode.description.slice(0, 400),
        artworkImageURL: episode.artwork || podcast.artwork,
      });
      const tvjsPlayer = currentTVJSPlayer();
      if (tvjsPlayer && episode.mediaType === "audio") {
        tvjsPlayer.overlayDocument = overlay;
      } else if (tvjsPlayer) {
        tvjsPlayer.overlayDocument = null;
      }
    },
    [player.play, save, overlay],
  );

  const { currentTime, duration, state, currentItem, seek } = player;

  useEffect(() => {
    if (state === "playing" && pendingSeek.current > 0) {
      seek(pendingSeek.current);
      pendingSeek.current = 0;
    }
  }, [state, seek]);

  // Persist the playback position. TVJS reports time about once a second;
  // write every few seconds and on every state change (pause, end).
  useEffect(() => {
    if (!nowPlaying || currentItem?.url !== nowPlaying.episode.url || currentTime <= 0) return;
    if (pendingSeek.current > 0) return; // still at 0 before the resume seek

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
      {createPortal(<NowPlayingOverlay nowPlaying={nowPlaying} />, overlay.documentElement)}
    </PlayerContext.Provider>
  );
}

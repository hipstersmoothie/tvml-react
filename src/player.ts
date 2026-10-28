// Fullscreen media playback through TVJS Player / Playlist / MediaItem.

import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DocumentPortal } from "./document-portal.js";
import type { TVMLDocument } from "./dom.js";

export type PlaybackState =
  | "idle"
  | "begin"
  | "loading"
  | "playing"
  | "paused"
  | "scanning"
  | "end";

export interface MediaItemInput {
  url: string;
  /** Defaults to "video". */
  type?: "video" | "audio";
  title?: string;
  subtitle?: string;
  description?: string;
  artworkImageURL?: string;
  /** Seconds to start from, without asking. */
  startTime?: number;
  /**
   * Seconds to offer resuming from. TVMLKit shows a "Resume Playback / Start
   * from Beginning" prompt and waits; use `startTime` to just start there.
   */
  resumeTime?: number;
}

interface TVJSMediaItem {
  title?: string;
  subtitle?: string;
  description?: string;
  artworkImageURL?: string;
  resumeTime?: number;
  url: string;
}

interface TVJSPlaylist {
  push(item: TVJSMediaItem): void;
}

interface TVJSPlayerEvent {
  state?: string;
  time?: number;
  reason?: number;
}

/** The TVJS `Player` behind `usePlayer`. */
export interface NativePlayer {
  overlayDocument?: TVMLDocument;
  interactiveOverlayDocument?: TVMLDocument;
  interactiveOverlayDismissable?: boolean;
  playlist?: TVJSPlaylist;
  currentMediaItem?: TVJSMediaItem;
  currentMediaItemDuration?: number;
  present(): void;
  play(): void;
  pause(): void;
  stop(): void;
  seekToTime(seconds: number): void;
  changeToMediaAtIndex(index: number): void;
  addEventListener(
    type: string,
    listener: (event: TVJSPlayerEvent) => void,
    options?: { interval?: number },
  ): void;
  removeEventListener(type: string, listener: (event: TVJSPlayerEvent) => void): void;
}

type TVJSPlayer = NativePlayer;

interface TVJSPlayerGlobals {
  Player?: new () => TVJSPlayer;
  MediaItemChangeReason?: { ERRORED?: number };
  Playlist?: new () => TVJSPlaylist;
  MediaItem?: new (type: string, url: string) => TVJSMediaItem;
}

export interface PlayerControls {
  /** Present the fullscreen player and start playing `items`. */
  play(items: MediaItemInput | Array<MediaItemInput>, options?: { startIndex?: number }): void;
  pause(): void;
  resume(): void;
  stop(): void;
  seek(seconds: number): void;
  state: PlaybackState;
  /** Seconds into the current item, updated about once a second. */
  currentTime: number;
  /** Seconds, or NaN until known. */
  duration: number;
  /** The item currently playing. */
  currentItem: MediaItemInput | null;
  /** True if the last item stopped because of a playback error. */
  error: boolean;
  /** The TVJS Player itself, created on first use. */
  nativePlayer(): NativePlayer;
  /** @internal Used by PlayerOverlay. */
  setOverlay(kind: OverlayKind, doc: TVMLDocument | undefined): void;
}

type OverlayKind = "overlayDocument" | "interactiveOverlayDocument";

function toMediaItem(input: MediaItemInput): TVJSMediaItem {
  const { MediaItem } = globalThis as unknown as TVJSPlayerGlobals;
  if (!MediaItem) {
    throw new Error("tvml-react: MediaItem is not available outside TVMLKit");
  }
  const item = new MediaItem(input.type ?? "video", input.url);
  if (input.title !== undefined) item.title = input.title;
  if (input.subtitle !== undefined) item.subtitle = input.subtitle;
  if (input.description !== undefined) item.description = input.description;
  if (input.artworkImageURL !== undefined) item.artworkImageURL = input.artworkImageURL;
  if (input.resumeTime !== undefined) item.resumeTime = input.resumeTime;
  return item;
}

/**
 * Play video or audio in TVMLKit's fullscreen player.
 *
 *   const player = usePlayer();
 *   <lockup onSelect={() => player.play({ url, title })} />
 *
 * Each call owns a player, stopped when the component unmounts; call it once
 * per screen (or share it through context) rather than per row. Presenting the
 * player fires `disappear` on the screen underneath.
 */
export function usePlayer(): PlayerControls {
  const playerRef = useRef<TVJSPlayer | null>(null);
  const itemsRef = useRef<Array<MediaItemInput>>([]);
  const pendingSeek = useRef<number | undefined>(undefined);
  // True between play() and the end of playback. A new TVJS Player reports
  // "begin" on its own, and keeps sending time updates while tearing down.
  const active = useRef(false);
  const overlays = useRef<Partial<Record<OverlayKind, TVMLDocument>>>({});
  // TVMLKit only shows overlay documents reliably when they're assigned once
  // playback is underway, so (re)assign them on the first "playing" of a play().
  const assignOverlaysOnPlaying = useRef(false);
  // Until a startTime seek lands, hold currentTime at the target instead of
  // reporting the first moments from 0.
  const seekTarget = useRef<number | undefined>(undefined);
  const [state, setState] = useState<PlaybackState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number.NaN);
  const [currentItem, setCurrentItem] = useState<MediaItemInput | null>(null);
  const [error, setError] = useState(false);

  const nativePlayer = useCallback((): TVJSPlayer => {
    if (playerRef.current) {
      return playerRef.current;
    }
    const globals = globalThis as unknown as TVJSPlayerGlobals;
    if (!globals.Player) {
      throw new Error("tvml-react: Player is not available outside TVMLKit");
    }
    const player = new globals.Player();

    player.addEventListener("stateDidChange", (event) => {
      if (!active.current) return;
      const next = (event.state as PlaybackState | undefined) ?? "idle";
      if (next === "end") active.current = false;
      setState(next);
      setDuration(player.currentMediaItemDuration ?? Number.NaN);
      if (next === "playing" && pendingSeek.current !== undefined) {
        player.seekToTime(pendingSeek.current);
        pendingSeek.current = undefined;
      }
      if (next === "playing" && assignOverlaysOnPlaying.current) {
        assignOverlaysOnPlaying.current = false;
        for (const [kind, doc] of Object.entries(overlays.current)) {
          player[kind as OverlayKind] = undefined;
          player[kind as OverlayKind] = doc;
        }
      }
    });
    player.addEventListener(
      "timeDidChange",
      (event) => {
        // Ignore updates while tearing down (they can rewind or report 0);
        // keep the last real time.
        if (!active.current || !event.time) return;
        const target = seekTarget.current;
        if (target !== undefined) {
          if (event.time < target - 1) return;
          seekTarget.current = undefined;
        }
        setCurrentTime(event.time);
      },
      { interval: 1 },
    );
    player.addEventListener("mediaItemWillChange", (event) => {
      const errored = globals.MediaItemChangeReason?.ERRORED;
      if (errored !== undefined && event.reason === errored) {
        setError(true);
      }
    });
    player.addEventListener("mediaItemDidChange", () => {
      const media = player.currentMediaItem;
      // Fires with no item when playback stops; keep the finished item's state.
      if (!media) return;
      const item = itemsRef.current.find((i) => i.url === media.url) ?? null;
      setCurrentItem(item);
      setCurrentTime(item?.startTime ?? 0);
      setDuration(player.currentMediaItemDuration ?? Number.NaN);
      pendingSeek.current = item?.startTime;
      seekTarget.current = item?.startTime;
    });

    playerRef.current = player;
    return player;
  }, []);

  useEffect(() => () => playerRef.current?.stop(), []);

  const play = useCallback<PlayerControls["play"]>(
    (items, options = {}) => {
      const { Playlist } = globalThis as unknown as TVJSPlayerGlobals;
      if (!Playlist) {
        throw new Error("tvml-react: Playlist is not available outside TVMLKit");
      }
      const list = Array.isArray(items) ? items : [items];
      itemsRef.current = list;

      const playlist = new Playlist();
      for (const item of list) {
        playlist.push(toMediaItem(item));
      }

      const player = nativePlayer();
      player.playlist = playlist;
      if (options.startIndex) {
        player.changeToMediaAtIndex(options.startIndex);
      }
      const first = list[options.startIndex ?? 0] ?? null;
      setCurrentItem(first);
      setCurrentTime(first?.startTime ?? 0);
      setError(false);
      pendingSeek.current = first?.startTime;
      seekTarget.current = first?.startTime;
      active.current = true;
      assignOverlaysOnPlaying.current = true;
      player.present();
      player.play();
    },
    [nativePlayer],
  );

  return {
    play,
    pause: useCallback(() => playerRef.current?.pause(), []),
    resume: useCallback(() => playerRef.current?.play(), []),
    stop: useCallback(() => {
      active.current = false;
      playerRef.current?.stop();
    }, []),
    seek: useCallback((seconds: number) => playerRef.current?.seekToTime(seconds), []),
    state,
    currentTime,
    duration,
    currentItem,
    error,
    nativePlayer,
    setOverlay: useCallback((kind: OverlayKind, doc: TVMLDocument | undefined) => {
      overlays.current[kind] = doc;
      const player = playerRef.current;
      if (!player) return;
      if (active.current && doc) {
        // Already playing: re-assign so TVMLKit picks it up.
        player[kind] = undefined;
      }
      player[kind] = doc;
    }, []),
  };
}

export interface PlayerOverlayProps {
  player: PlayerControls;
  /**
   * An interactive overlay takes focus (the user swipes down to show it);
   * a plain one is drawn over the video without taking input.
   */
  interactive?: boolean;
  /** A template element, usually `divTemplate`. */
  children?: ReactNode;
}

/**
 * Render React over the fullscreen player: artwork for audio, live chat, a
 * now-playing card. It can be mounted before or during playback.
 */
export function PlayerOverlay({ player, interactive = false, children }: PlayerOverlayProps) {
  const kind: OverlayKind = interactive ? "interactiveOverlayDocument" : "overlayDocument";
  const { setOverlay } = player;
  const [doc, setDoc] = useState<TVMLDocument | null>(null);

  // Registers the document under the current kind once it's ready, moves it
  // if `interactive` changes, and unregisters it on unmount.
  useLayoutEffect(() => {
    if (!doc) return;
    setOverlay(kind, doc);
    return () => setOverlay(kind, undefined);
  }, [setOverlay, kind, doc]);

  return createElement(DocumentPortal, { onReady: setDoc, children });
}

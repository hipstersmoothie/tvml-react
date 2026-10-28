// Fullscreen media playback through TVJS Player / Playlist / MediaItem.
//
// A PlayerStore wraps one TVJS Player and exposes its state as an external
// store. <PlayerProvider> shares one store with the whole app
// (usePlayerControls / usePlayerState / usePlayerEvent); usePlayer() uses the
// shared one when there is a provider, or its own otherwise.

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
  MediaItemChangeReason?: Partial<
    Record<
      | "UNKNOWN"
      | "PLAYED_TO_END"
      | "FORWARDED_TO_END"
      | "ERRORED"
      | "PLAYLIST_CHANGED"
      | "USER_INITIATED",
      number
    >
  >;
  Playlist?: new () => TVJSPlaylist;
  MediaItem?: new (type: string, url: string) => TVJSMediaItem;
}

/** Why the last item stopped playing. */
export type EndReason =
  | "playedToEnd"
  | "forwardedToEnd"
  | "error"
  | "playlistChanged"
  | "userInitiated"
  | "stopped"
  | "unknown";

export interface PlayerState {
  state: PlaybackState;
  /** Seconds into the current item, updated about once a second. */
  currentTime: number;
  /** Seconds, or NaN until known (and for live streams). */
  duration: number;
  /** The item currently (or last) playing. */
  currentItem: MediaItemInput | null;
  /** True if the last item stopped because of a playback error. */
  error: boolean;
  /** Playing or paused with no known duration: a live stream. */
  isLive: boolean;
  /** Why the last item ended, once it has. */
  endReason: EndReason | null;
}

/** Passed to `itemEnd` listeners, e.g. to save where the user stopped. */
export interface ItemEndEvent {
  item: MediaItemInput;
  /** The last position reached, in seconds. */
  time: number;
  duration: number;
  reason: EndReason;
}

type OverlayKind = "overlayDocument" | "interactiveOverlayDocument";

export interface PlayerActions {
  /** Present the fullscreen player and start playing `items`. */
  play(items: MediaItemInput | Array<MediaItemInput>, options?: { startIndex?: number }): void;
  pause(): void;
  resume(): void;
  stop(): void;
  seek(seconds: number): void;
  /**
   * Show the fullscreen player again. Menu during audio playback returns to
   * the app while the audio keeps playing; this brings the player UI back.
   */
  present(): void;
  /** The TVJS Player itself, created on first use. */
  nativePlayer(): NativePlayer;
  /** @internal Used by PlayerOverlay. */
  setOverlay(kind: OverlayKind, doc: TVMLDocument | undefined): void;
}

export type PlayerControls = PlayerActions & PlayerState;

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

const INITIAL_STATE: PlayerState = {
  state: "idle",
  currentTime: 0,
  duration: Number.NaN,
  currentItem: null,
  error: false,
  isLive: false,
  endReason: null,
};

function endReasonFor(reason: number | undefined): EndReason {
  const reasons = (globalThis as unknown as TVJSPlayerGlobals).MediaItemChangeReason ?? {};
  switch (reason) {
    case undefined:
      return "unknown";
    case reasons.PLAYED_TO_END:
      return "playedToEnd";
    case reasons.FORWARDED_TO_END:
      return "forwardedToEnd";
    case reasons.ERRORED:
      return "error";
    case reasons.PLAYLIST_CHANGED:
      return "playlistChanged";
    case reasons.USER_INITIATED:
      return "userInitiated";
    default:
      return "unknown";
  }
}

export class PlayerStore {
  private snapshot: PlayerState = INITIAL_STATE;
  private listeners = new Set<() => void>();
  private endListeners = new Set<(event: ItemEndEvent) => void>();
  private native: TVJSPlayer | null = null;
  private items: Array<MediaItemInput> = [];
  // True between play() and the end of playback. A new TVJS Player reports
  // "begin" on its own, and keeps sending time updates while tearing down.
  private active = false;
  // Set once the current item's itemEnd has been emitted.
  private ended = false;
  private pendingSeek: number | undefined;
  // Until a startTime seek lands, hold currentTime at the target instead of
  // reporting the first moments from 0.
  private seekTarget: number | undefined;
  private overlays: Partial<Record<OverlayKind, TVMLDocument>> = {};
  // TVMLKit only shows overlay documents reliably when they're assigned once
  // playback is underway, so (re)assign them on the first "playing" of a play().
  private assignOverlaysOnPlaying = false;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PlayerState => this.snapshot;

  onItemEnd = (listener: (event: ItemEndEvent) => void): (() => void) => {
    this.endListeners.add(listener);
    return () => this.endListeners.delete(listener);
  };

  private set(patch: Partial<PlayerState>): void {
    const next = { ...this.snapshot, ...patch };
    next.isLive =
      (next.state === "playing" || next.state === "paused") && !Number.isFinite(next.duration);
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  private emitEnd(reason: EndReason): void {
    const { currentItem, currentTime, duration } = this.snapshot;
    if (this.ended || !currentItem) return;
    this.ended = true;
    this.set({ endReason: reason, error: reason === "error" || this.snapshot.error });
    const event: ItemEndEvent = { item: currentItem, time: currentTime, duration, reason };
    for (const listener of this.endListeners) listener(event);
  }

  nativePlayer = (): TVJSPlayer => {
    if (this.native) {
      return this.native;
    }
    const globals = globalThis as unknown as TVJSPlayerGlobals;
    if (!globals.Player) {
      throw new Error("tvml-react: Player is not available outside TVMLKit");
    }
    const player = new globals.Player();

    player.addEventListener("stateDidChange", (event) => {
      if (!this.active) return;
      const next = (event.state as PlaybackState | undefined) ?? "idle";
      this.set({ state: next, duration: player.currentMediaItemDuration ?? Number.NaN });
      if (next === "playing" && this.pendingSeek !== undefined) {
        player.seekToTime(this.pendingSeek);
        this.pendingSeek = undefined;
      }
      if (next === "playing" && this.assignOverlaysOnPlaying) {
        this.assignOverlaysOnPlaying = false;
        for (const [kind, doc] of Object.entries(this.overlays)) {
          player[kind as OverlayKind] = undefined;
          player[kind as OverlayKind] = doc;
        }
      }
      if (next === "end") {
        this.emitEnd("userInitiated");
        this.active = false;
      }
    });
    player.addEventListener(
      "timeDidChange",
      (event) => {
        // Ignore updates while tearing down (they can rewind or report 0);
        // keep the last real time.
        if (!this.active || !event.time) return;
        const target = this.seekTarget;
        if (target !== undefined) {
          if (event.time < target - 1) return;
          this.seekTarget = undefined;
        }
        this.set({ currentTime: event.time });
      },
      { interval: 1 },
    );
    player.addEventListener("mediaItemWillChange", (event) => {
      this.emitEnd(endReasonFor(event.reason));
    });
    player.addEventListener("mediaItemDidChange", () => {
      const media = player.currentMediaItem;
      // Fires with no item when playback stops; keep the finished item's state.
      if (!media) return;
      const item = this.items.find((i) => i.url === media.url) ?? null;
      this.ended = false;
      this.pendingSeek = item?.startTime;
      this.seekTarget = item?.startTime;
      this.set({
        currentItem: item,
        currentTime: item?.startTime ?? 0,
        duration: player.currentMediaItemDuration ?? Number.NaN,
        endReason: null,
      });
    });

    this.native = player;
    return player;
  };

  play = (items: MediaItemInput | Array<MediaItemInput>, options: { startIndex?: number } = {}) => {
    const { Playlist } = globalThis as unknown as TVJSPlayerGlobals;
    if (!Playlist) {
      throw new Error("tvml-react: Playlist is not available outside TVMLKit");
    }
    const list = Array.isArray(items) ? items : [items];
    this.items = list;

    const playlist = new Playlist();
    for (const item of list) {
      playlist.push(toMediaItem(item));
    }

    const player = this.nativePlayer();
    player.playlist = playlist;
    if (options.startIndex) {
      player.changeToMediaAtIndex(options.startIndex);
    }
    const first = list[options.startIndex ?? 0] ?? null;
    this.ended = false;
    this.pendingSeek = first?.startTime;
    this.seekTarget = first?.startTime;
    this.active = true;
    this.assignOverlaysOnPlaying = true;
    this.set({
      currentItem: first,
      currentTime: first?.startTime ?? 0,
      error: false,
      endReason: null,
    });
    player.present();
    player.play();
  };

  pause = () => this.native?.pause();
  resume = () => this.native?.play();
  seek = (seconds: number) => this.native?.seekToTime(seconds);

  stop = () => {
    this.emitEnd("stopped");
    this.active = false;
    this.native?.stop();
    // The player's own state change is ignored once inactive.
    this.set({ state: "end" });
  };

  present = () => this.native?.present();

  setOverlay = (kind: OverlayKind, doc: TVMLDocument | undefined) => {
    this.overlays[kind] = doc;
    const player = this.native;
    if (!player) return;
    if (this.active && doc) {
      // Already playing: re-assign so TVMLKit picks it up.
      player[kind] = undefined;
    }
    player[kind] = doc;
  };

  /** Stable action functions. */
  readonly actions: PlayerActions = {
    play: (...args) => this.play(...args),
    pause: () => this.pause(),
    resume: () => this.resume(),
    stop: () => this.stop(),
    seek: (seconds) => this.seek(seconds),
    present: () => this.present(),
    nativePlayer: () => this.nativePlayer(),
    setOverlay: (kind, doc) => this.setOverlay(kind, doc),
  };
}

const PlayerContext = createContext<PlayerStore | null>(null);

export interface PlayerProviderProps {
  /** Called whenever an item stops: played to the end, stopped, errored, or the user left. */
  onItemEnd?: (event: ItemEndEvent) => void;
  children?: ReactNode;
}

/**
 * One player for the whole app. Put it in `launch`'s `wrapper` so every
 * screen (and tab) shares it: any screen can start playback, and any can show
 * what's playing.
 */
export function PlayerProvider({ onItemEnd, children }: PlayerProviderProps) {
  const [store] = useState(() => new PlayerStore());
  const onItemEndRef = useRef(onItemEnd);
  onItemEndRef.current = onItemEnd;
  useEffect(() => store.onItemEnd((event) => onItemEndRef.current?.(event)), [store]);
  useEffect(() => () => store.stop(), [store]);
  return createElement(PlayerContext.Provider, { value: store }, children);
}

function useSharedStore(hook: string): PlayerStore {
  const store = useContext(PlayerContext);
  if (!store) {
    throw new Error(`tvml-react: ${hook} must be used inside <PlayerProvider>`);
  }
  return store;
}

/** The shared player's actions. Stable; never re-renders the caller. */
export function usePlayerControls(): PlayerActions {
  return useSharedStore("usePlayerControls").actions;
}

const identity = <T,>(value: T) => value;

/**
 * Subscribe to the shared player's state. With a selector, the caller only
 * re-renders when the selected value changes:
 *
 *   const playing = usePlayerState((s) => s.state === "playing");
 */
export function usePlayerState(): PlayerState;
export function usePlayerState<T>(selector: (state: PlayerState) => T): T;
export function usePlayerState<T>(selector: (state: PlayerState) => T = identity as never): T {
  const store = useSharedStore("usePlayerState");
  return useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()));
}

/** Run `handler` when an item stops playing, for any reason. */
export function usePlayerEvent(type: "itemEnd", handler: (event: ItemEndEvent) => void): void {
  const store = useSharedStore("usePlayerEvent");
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (type !== "itemEnd") return;
    return store.onItemEnd((event) => latest.current(event));
  }, [store, type]);
}

/**
 * Play video or audio in TVMLKit's fullscreen player.
 *
 *   const player = usePlayer();
 *   <lockup onSelect={() => player.play({ url, title })} />
 *
 * Inside a <PlayerProvider> this is the shared player. Without one, each call
 * owns a player that stops when the component unmounts. Either way the caller
 * re-renders as playback progresses; use `usePlayerControls` /
 * `usePlayerState(selector)` to avoid that. Presenting the player fires
 * `disappear` on the screen underneath.
 */
export function usePlayer(): PlayerControls {
  const shared = useContext(PlayerContext);
  const [local] = useState(() => (shared ? null : new PlayerStore()));
  const store = shared ?? local!;
  useEffect(() => () => local?.stop(), [local]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return useMemo(() => ({ ...store.actions, ...state }), [store, state]);
}

export interface PlayerOverlayProps {
  /** Defaults to the shared player from <PlayerProvider>. */
  player?: PlayerActions;
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
  const shared = useContext(PlayerContext);
  const actions = player ?? shared?.actions;
  if (!actions) {
    throw new Error("tvml-react: <PlayerOverlay> needs a `player` or a <PlayerProvider>");
  }
  const kind: OverlayKind = interactive ? "interactiveOverlayDocument" : "overlayDocument";
  const { setOverlay } = actions;
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

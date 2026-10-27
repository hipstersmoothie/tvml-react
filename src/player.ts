// Fullscreen media playback through TVJS Player / Playlist / MediaItem.

import { useCallback, useEffect, useRef, useState } from "react";

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
  /** Seconds to start from. */
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
}

interface TVJSPlayer {
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

interface TVJSPlayerGlobals {
  Player?: new () => TVJSPlayer;
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
}

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
 */
export function usePlayer(): PlayerControls {
  const playerRef = useRef<TVJSPlayer | null>(null);
  const itemsRef = useRef<Array<MediaItemInput>>([]);
  const [state, setState] = useState<PlaybackState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number.NaN);
  const [currentItem, setCurrentItem] = useState<MediaItemInput | null>(null);

  const getPlayer = useCallback((): TVJSPlayer => {
    if (playerRef.current) {
      return playerRef.current;
    }
    const { Player } = globalThis as unknown as TVJSPlayerGlobals;
    if (!Player) {
      throw new Error("tvml-react: Player is not available outside TVMLKit");
    }
    const player = new Player();

    player.addEventListener("stateDidChange", (event) => {
      setState((event.state as PlaybackState | undefined) ?? "idle");
      setDuration(player.currentMediaItemDuration ?? Number.NaN);
    });
    player.addEventListener(
      "timeDidChange",
      (event) => setCurrentTime(event.time ?? 0),
      { interval: 1 },
    );
    player.addEventListener("mediaItemDidChange", () => {
      const url = player.currentMediaItem?.url;
      setCurrentItem(itemsRef.current.find((item) => item.url === url) ?? null);
      setCurrentTime(0);
      setDuration(player.currentMediaItemDuration ?? Number.NaN);
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

      const player = getPlayer();
      player.playlist = playlist;
      if (options.startIndex) {
        player.changeToMediaAtIndex(options.startIndex);
      }
      setCurrentItem(list[options.startIndex ?? 0] ?? null);
      player.present();
      player.play();
    },
    [getPlayer],
  );

  return {
    play,
    pause: useCallback(() => playerRef.current?.pause(), []),
    resume: useCallback(() => playerRef.current?.play(), []),
    stop: useCallback(() => playerRef.current?.stop(), []),
    seek: useCallback((seconds: number) => playerRef.current?.seekToTime(seconds), []),
    state,
    currentTime,
    duration,
    currentItem,
  };
}

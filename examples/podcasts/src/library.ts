// The user's library, persisted with useLocalStorage: subscriptions and
// per-episode listening progress. Every screen using these hooks stays in sync.

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "tvml-react";

import type { Episode, Podcast, Progress } from "./types";

const SUBSCRIPTIONS = "podcasts.subscriptions.v1";
const PROGRESS = "podcasts.progress.v1";

/** Only the fields we need to show and reopen a podcast. */
function snapshot(podcast: Podcast): Podcast {
  const { id, title, author, artwork, genre, feedUrl } = podcast;
  return { id, title, author, artwork, genre, feedUrl };
}

export function useSubscriptions() {
  const [stored, setSubscriptions] = useLocalStorage<Array<Podcast>>(SUBSCRIPTIONS, []);
  // Stored data outlives app versions; never trust it to be well-formed.
  const subscriptions = useMemo(
    () => stored.filter((p, i) => p?.id && stored.findIndex((q) => q?.id === p.id) === i),
    [stored],
  );

  const isSubscribed = useCallback(
    (id: string) => subscriptions.some((p) => p.id === id),
    [subscriptions],
  );

  const toggle = useCallback(
    (podcast: Podcast) =>
      setSubscriptions((current) =>
        current.some((p) => p.id === podcast.id)
          ? current.filter((p) => p.id !== podcast.id)
          : [snapshot(podcast), ...current],
      ),
    [setSubscriptions],
  );

  return { subscriptions, isSubscribed, toggle };
}

type ProgressMap = Record<string, Progress>;

// Keep storage bounded: only the most recent entries survive.
const MAX_ENTRIES = 200;

function prune(map: ProgressMap): ProgressMap {
  const entries = Object.entries(map);
  if (entries.length <= MAX_ENTRIES) return map;
  entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  return Object.fromEntries(entries.slice(0, MAX_ENTRIES));
}

export function useProgress() {
  const [progress, setProgress] = useLocalStorage<ProgressMap>(PROGRESS, {});

  const save = useCallback(
    (
      episode: Episode,
      podcast: Podcast,
      update: Partial<Pick<Progress, "position" | "duration" | "played">>,
    ) =>
      setProgress((current) => {
        const previous = current[episode.id];
        const next: Progress = {
          position: previous?.position ?? 0,
          duration: previous?.duration || episode.duration,
          played: previous?.played ?? false,
          ...update,
          updatedAt: Date.now(),
          episode: { ...episode, description: "" },
          podcast: snapshot(podcast),
        };
        return prune({ ...current, [episode.id]: next });
      }),
    [setProgress],
  );

  const clear = useCallback(
    (episodeId: string) =>
      setProgress((current) => {
        const { [episodeId]: _removed, ...rest } = current;
        return rest;
      }),
    [setProgress],
  );

  /** Started but unfinished episodes, most recent first. */
  const inProgress = useMemo(
    () =>
      Object.values(progress)
        .filter((p) => !p.played && p.position >= 15)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [progress],
  );

  return { progress, inProgress, save, clear };
}

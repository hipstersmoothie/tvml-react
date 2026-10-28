import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "tvml-react";

import type { Livestream } from "./api";

/** `Date.now()` that ticks every `intervalMs`, for "5 min ago" labels. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface SeenStreamer {
  did: string;
  handle: string;
  title: string;
  lastLiveAt: number;
}

// Streamers to suggest before we've seen anyone live on this Apple TV.
const SEEDS: Array<SeenStreamer> = [
  { did: "did:plc:rbvrr34edl5ddpuwcubjiost", handle: "stream.place", title: "Streamplace", lastLiveAt: 0 },
  { did: "did:plc:2zmxikig2sj7gqaezl5gntae", handle: "iame.li", title: "Building Streamplace", lastLiveAt: 0 },
];
const MAX_HISTORY = 24;

/**
 * Streamers seen live on this Apple TV, newest first, remembered in
 * `localStorage`. Each successful fetch of the live list (a new `updatedAt`)
 * stamps everyone in it. (`streams` keeps its identity while the list is
 * unchanged, so it can't be the trigger.)
 */
export function useRecentlyLive(streams: Array<Livestream> | undefined, updatedAt: number): Array<SeenStreamer> {
  const [saved, setSaved] = useLocalStorage<Array<SeenStreamer>>("streamplace.history", []);
  const latest = useRef(streams);
  latest.current = streams;

  useEffect(() => {
    const live = latest.current;
    if (!live?.length) return;
    setSaved((current) => {
      const byDid = new Map(current.map((s) => [s.did, s]));
      for (const s of live) {
        byDid.set(s.author.did, { did: s.author.did, handle: s.author.handle, title: s.record.title, lastLiveAt: updatedAt });
      }
      return [...byDid.values()].sort((a, b) => b.lastLiveAt - a.lastLiveAt).slice(0, MAX_HISTORY);
    });
  }, [updatedAt, setSaved]);

  return useMemo(() => {
    const dids = new Set(saved.map((s) => s.did));
    return [...saved, ...SEEDS.filter((s) => !dids.has(s.did))];
  }, [saved]);
}

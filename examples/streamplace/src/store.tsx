// App-wide state shared by the home screen and pushed stream screens:
// streamer profiles (avatars, display names) and the "recently live" history.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocalStorage } from "tvml-react";

import { getProfiles, type Livestream, type Profile } from "./api";

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

interface Store {
  profiles: Record<string, Profile>;
  /** Ask for profiles; already-known DIDs are skipped. */
  requestProfiles(dids: Array<string>): void;
  history: Array<SeenStreamer>;
  rememberLive(streams: Array<Livestream>): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children?: ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const requested = useRef(new Set<string>());

  const requestProfiles = useCallback((dids: Array<string>) => {
    const missing = dids.filter((did) => !requested.current.has(did));
    if (missing.length === 0) return;
    for (const did of missing) requested.current.add(did);
    getProfiles(missing).then(
      (list) =>
        setProfiles((current) => {
          const next = { ...current };
          for (const p of list) next[p.did] = p;
          return next;
        }),
      () => {
        for (const did of missing) requested.current.delete(did);
      },
    );
  }, []);

  const [saved, setSaved] = useLocalStorage<Array<SeenStreamer>>("streamplace.history", []);
  const rememberLive = useCallback(
    (streams: Array<Livestream>) => {
      if (streams.length === 0) return;
      setSaved((current) => {
        const now = Date.now();
        const byDid = new Map(current.map((s) => [s.did, s]));
        for (const s of streams) {
          byDid.set(s.author.did, {
            did: s.author.did,
            handle: s.author.handle,
            title: s.record.title,
            lastLiveAt: now,
          });
        }
        return [...byDid.values()].sort((a, b) => b.lastLiveAt - a.lastLiveAt).slice(0, MAX_HISTORY);
      });
    },
    [setSaved],
  );

  const history = useMemo(() => {
    const dids = new Set(saved.map((s) => s.did));
    return [...saved, ...SEEDS.filter((s) => !dids.has(s.did))];
  }, [saved]);

  const store = useMemo(
    () => ({ profiles, requestProfiles, history, rememberLive }),
    [profiles, requestProfiles, history, rememberLive],
  );
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}

/** Profiles for `dids`, fetched on demand. */
export function useProfiles(dids: Array<string>): Record<string, Profile> {
  const { profiles, requestProfiles } = useStore();
  const key = dids.join(",");
  useEffect(() => {
    if (key) requestProfiles(key.split(","));
  }, [key, requestProfiles]);
  return profiles;
}

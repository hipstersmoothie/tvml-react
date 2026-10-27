import { useEffect } from "react";
import { useNavigation, useNetworkStatus } from "tvml-react";

import { getLiveStreams, thumbnailUrl, type Livestream } from "./api";
import { ago, clockTime, oneLine, viewers } from "./format";
import { useLiveData, useNow } from "./hooks";
import { useProfiles, useStore, type SeenStreamer } from "./store";
import { StreamScreen } from "./StreamScreen";

const REFRESH_MS = 30_000;

export function App() {
  const navigation = useNavigation();
  const network = useNetworkStatus();
  const { history, rememberLive } = useStore();
  const live = useLiveData(getLiveStreams, REFRESH_MS);
  const now = useNow();

  const streams = live.data ?? [];
  useEffect(() => {
    if (live.data) rememberLive(live.data);
  }, [live.data, rememberLive]);

  const liveDids = new Set(streams.map((s) => s.author.did));
  const offline = history.filter((s) => !liveDids.has(s.did));
  const profiles = useProfiles([...liveDids, ...offline.map((s) => s.did)]);

  if (live.status === "loading") {
    return (
      <loadingTemplate theme="dark">
        <activityIndicator>
          <title>Finding live streams…</title>
        </activityIndicator>
      </loadingTemplate>
    );
  }

  if (live.status === "error") {
    return (
      <alertTemplate theme="dark">
        <title>{network.online ? "Couldn’t reach stream.place" : "You’re offline"}</title>
        <description>
          {network.online
            ? `${live.error.message}. Check your connection and try again.`
            : "Connect your Apple TV to the internet to watch live streams."}
        </description>
        <button onSelect={live.refresh}>
          <text>Try Again</text>
        </button>
      </alertTemplate>
    );
  }

  const open = (did: string, stream?: Livestream) =>
    navigation.push(<StreamScreen did={did} initial={stream} />);

  const status = live.error
    ? `Couldn’t refresh (${live.error.message}) · showing ${clockTime(live.updatedAt)}`
    : streams.length === 0
      ? `Nobody’s live right now · checking again every ${REFRESH_MS / 1000} seconds`
      : `${streams.length} live ${streams.length === 1 ? "stream" : "streams"} · updated ${clockTime(live.updatedAt)}`;

  // A new thumbnail URL per refresh so TVMLKit fetches a fresh frame.
  const thumbVersion = Math.floor(live.updatedAt / REFRESH_MS);

  return (
    <stackTemplate theme="dark">
      <banner>
        <title>stream.place</title>
        <description>{status}</description>
      </banner>
      <collectionList>
        {streams.length > 0 && (
          <shelf>
            <header>
              <title>Live now</title>
            </header>
            <section>
              {streams.map((stream) => {
                const { did, handle } = stream.author;
                const profile = profiles[did];
                return (
                  <lockup key={did} onSelect={() => open(did, stream)}>
                    <img src={thumbnailUrl(did, thumbVersion)} width={480} height={270} />
                    <overlay style={{ padding: 16 }}>
                      {profile?.avatar && (
                        <badge src={profile.avatar} width={64} height={64} style={{ tvPosition: "bottom-left", borderRadius: 32 }} />
                      )}
                      <textBadge style={{ tvPosition: "top-left", backgroundColor: "rgb(220, 38, 38)", color: "white" }}>
                        LIVE
                      </textBadge>
                    </overlay>
                    <title>{oneLine(stream.record.title)}</title>
                    <subtitle>{`${profile?.displayName || `@${handle}`} · ${viewers(stream.viewerCount?.count)}`}</subtitle>
                  </lockup>
                );
              })}
            </section>
          </shelf>
        )}
        {offline.length > 0 && (
          <shelf>
            <header>
              <title>{streams.length > 0 ? "Recently live" : "Streamers you might like"}</title>
            </header>
            <section>
              {offline.map((s) => (
                <OfflineStreamer key={s.did} streamer={s} avatar={profiles[s.did]?.avatar} now={now} onSelect={() => open(s.did)} />
              ))}
            </section>
          </shelf>
        )}
      </collectionList>
    </stackTemplate>
  );
}

function OfflineStreamer({
  streamer,
  avatar,
  now,
  onSelect,
}: {
  streamer: SeenStreamer;
  avatar?: string;
  now: number;
  onSelect(): void;
}) {
  const [first = "", last = ""] = streamer.handle.split(".");
  return (
    <monogramLockup onSelect={onSelect}>
      <monogram src={avatar} firstName={first} lastName={last} />
      <title>{`@${streamer.handle}`}</title>
      <subtitle>{streamer.lastLiveAt ? `Live ${ago(new Date(streamer.lastLiveAt).toISOString(), now)}` : "Offline"}</subtitle>
    </monogramLockup>
  );
}

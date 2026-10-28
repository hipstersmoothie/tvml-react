import { keepPreviousData } from "@tanstack/react-query";
import { useNavigation } from "tvml-react";
import { useScreenQuery } from "tvml-react/query";

import { thumbnailUrl } from "./api";
import { ago, clockTime, oneLine, viewers } from "./format";
import { useNow, useRecentlyLive, type SeenStreamer } from "./hooks";
import { LIVE_REFRESH_MS, liveStreamsQuery, profilesQuery } from "./queries";
import { LIVE_BADGE, StreamScreen } from "./StreamScreen";

export function App() {
  const navigation = useNavigation();
  // Polls every 30 s while this screen is on the TV and the app is in the
  // foreground; refetches when it comes back into view or the app resumes.
  const live = useScreenQuery(liveStreamsQuery);
  const now = useNow();

  const streams = live.data ?? [];
  const history = useRecentlyLive(live.data, live.dataUpdatedAt);
  const liveDids = new Set(streams.map((s) => s.author.did));
  const offline = history.filter((s) => !liveDids.has(s.did));

  // Waits for the live list so live and offline streamers share one request.
  const profileDids = [...liveDids, ...offline.map((s) => s.did)];
  const { data: profiles = {} } = useScreenQuery({
    ...profilesQuery(profileDids),
    enabled: live.isSuccess && profileDids.length > 0,
    placeholderData: keepPreviousData,
  });

  if (live.isPending) {
    return live.fetchStatus === "paused" ? (
      <alertTemplate theme="dark">
        <title>You’re offline</title>
        <description>Live streams will load when your Apple TV is back online.</description>
      </alertTemplate>
    ) : (
      <loadingTemplate theme="dark">
        <activityIndicator>
          <title>Finding live streams…</title>
        </activityIndicator>
      </loadingTemplate>
    );
  }

  if (live.isLoadingError) {
    return (
      <alertTemplate theme="dark">
        <title>Couldn’t reach stream.place</title>
        <description>{`${live.error.message}. Check your connection and try again.`}</description>
        <button onSelect={() => void live.refetch()}>
          <text>Try Again</text>
        </button>
      </alertTemplate>
    );
  }

  const open = (did: string) =>
    navigation.push(<StreamScreen did={did} />);

  const status =
    live.fetchStatus === "paused"
      ? `You’re offline · showing ${clockTime(live.dataUpdatedAt)}`
      : live.isRefetchError
        ? `Couldn’t refresh (${live.error.message}) · showing ${clockTime(live.dataUpdatedAt)}`
        : streams.length === 0
          ? `Nobody’s live right now · checking again every ${LIVE_REFRESH_MS / 1000} seconds`
          : `${streams.length} live ${streams.length === 1 ? "stream" : "streams"} · updated ${clockTime(live.dataUpdatedAt)}`;

  // A new thumbnail URL per refresh so TVMLKit fetches a fresh frame.
  const thumbVersion = Math.floor(live.dataUpdatedAt / LIVE_REFRESH_MS);

  // The busiest few streams up top, big; everyone else in a grid below.
  const featured = streams.slice(0, 5);
  const rest = streams.slice(5);
  const name = (did: string, handle: string) => profiles[did]?.displayName || `@${handle}`;
  // A footnote, unless there's nothing live: then it's the news.
  const statusShelf = (
    <shelf>
      <header>
        <title>{status}</title>
      </header>
    </shelf>
  );

  return (
    <stackTemplate theme="dark">
      <collectionList>
        {streams.length === 0 && statusShelf}
        {featured.length > 0 && (
          <carousel>
            <section>
              {featured.map((stream) => {
                const { did, handle } = stream.author;
                return (
                  <lockup key={did} onSelect={() => open(did)}>
                    <img src={thumbnailUrl(did, thumbVersion)} width={1280} height={720} />
                    <overlay style={{ padding: 28 }}>
                      <textBadge style={{ tvPosition: "top-left", ...LIVE_BADGE }}>LIVE</textBadge>
                    </overlay>
                    <title>{oneLine(stream.record.title)}</title>
                    <subtitle>{`${name(did, handle)} · ${viewers(stream.viewerCount?.count)}`}</subtitle>
                  </lockup>
                );
              })}
            </section>
          </carousel>
        )}
        {rest.length > 0 && (
          <grid>
            <header>
              <title>More live streams</title>
            </header>
            <section>
              {rest.map((stream) => {
                const { did, handle } = stream.author;
                return (
                  <lockup key={did} onSelect={() => open(did)}>
                    <img src={thumbnailUrl(did, thumbVersion)} width={548} height={308} />
                    <overlay style={{ padding: 16 }}>
                      <textBadge style={{ tvPosition: "top-left", ...LIVE_BADGE }}>LIVE</textBadge>
                    </overlay>
                    <title>{oneLine(stream.record.title)}</title>
                    <subtitle>{`${name(did, handle)} · ${viewers(stream.viewerCount?.count)}`}</subtitle>
                  </lockup>
                );
              })}
            </section>
          </grid>
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
        {streams.length > 0 && statusShelf}
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

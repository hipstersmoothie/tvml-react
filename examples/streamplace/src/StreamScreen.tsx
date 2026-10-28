import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { PlayerOverlay, useKeepAwake, useNavigation, usePlayer } from "tvml-react";
import { useScreenQuery } from "tvml-react/query";

import {
  activityName,
  checkPlayable,
  playlistUrl,
  thumbnailUrl,
  type Livestream,
  type Profile,
} from "./api";
import { useStreamChat, type ChatMessage, type ChatStatus } from "./chat";
import { ago, oneLine, uptime, viewers } from "./format";
import { useNow } from "./hooks";
import { LIVE_REFRESH_MS, liveStreamsQuery, livestreamQuery, profileQuery, STREAM_REFRESH_MS } from "./queries";

export function StreamScreen({ did }: { did: string }) {
  const navigation = useNavigation();
  const player = usePlayer();
  const { data: profile } = useQuery(profileQuery(did));

  // The fullscreen player covers this screen, which pauses screen queries, but
  // the chat overlay drawn over the video still shows the viewer count: keep
  // it refreshing while watching.
  const watching = player.state !== "idle" && player.state !== "end";
  useKeepAwake(watching);

  const stream = useScreenQuery({ ...livestreamQuery(did), refreshWhileHidden: watching });
  const live = stream.data;
  // One chat socket for the page and the overlay, open while the stream is
  // live (covered by the player or not).
  const chat = useStreamChat(did, !!live);

  let content: ReactNode;
  if (live === undefined) {
    content =
      stream.fetchStatus === "paused" ? (
        <alertTemplate theme="dark">
          <title>You’re offline</title>
          <description>This page will load when your Apple TV is back online.</description>
          <button onSelect={() => navigation.pop()}>
            <text>Back</text>
          </button>
        </alertTemplate>
      ) : stream.isLoadingError ? (
        <alertTemplate theme="dark">
          <title>Couldn’t load this stream</title>
          <description>{stream.error.message}</description>
          <button onSelect={() => void stream.refetch()}>
            <text>Try Again</text>
          </button>
          <button onSelect={() => navigation.pop()}>
            <text>Back</text>
          </button>
        </alertTemplate>
      ) : (
        <loadingTemplate theme="dark">
          <activityIndicator>
            <title>Checking if they’re live…</title>
          </activityIndicator>
        </loadingTemplate>
      );
  } else if (live === null) {
    content = <OfflineStreamer did={did} profile={profile ?? undefined} checking={stream.isFetching} onRefresh={() => void stream.refetch()} />;
  } else {
    const name = profile?.displayName || `@${live.author.handle}`;
    const title = oneLine(live.record.title);
    const thumb = thumbnailUrl(did, Math.floor(stream.dataUpdatedAt / STREAM_REFRESH_MS));
    const play = () => {
      player.play({
        url: playlistUrl(did),
        title,
        subtitle: `${name} · live on stream.place`,
        description: activityName(live.record.activity),
        artworkImageURL: thumb,
      });
    };
    const cantPlay = (error: Error) => {
      void stream.refetch();
      navigation.presentModal(
        <alertTemplate theme="dark">
          <title>Can’t play this stream</title>
          <description>{error.message}</description>
          <button onSelect={() => navigation.dismissModal()}>
            <text>OK</text>
          </button>
        </alertTemplate>,
      );
    };
    content = (
      <LiveStream
        did={did}
        live={live}
        name={name}
        title={title}
        thumb={thumb}
        profile={profile ?? undefined}
        chat={chat}
        onPlay={play}
        onCantPlay={cantPlay}
      />
    );
  }

  // Mounted only while the player is up: TVMLKit doesn't draw an overlay
  // assigned before the player is presented. It sits outside `content`, so it
  // keeps rendering when the stream ends mid-watch.
  return (
    <>
      {content}
      {watching && (
        <PlayerOverlay player={player}>
          <ChatOverlay
            messages={chat.messages}
            heading={live === null ? "This stream has ended" : `Chat · ${viewers(live?.viewerCount?.count)}`}
          />
        </PlayerOverlay>
      )}
    </>
  );
}

/** The newest chat, drawn over the top right of the video. */
function ChatOverlay({ messages, heading }: { messages: Array<ChatMessage>; heading: string }) {
  const recent = messages.slice(0, 5).reverse(); // oldest at the top, like chat
  return (
    <divTemplate>
      <stack style={{ tvPosition: "top-right", width: 640, margin: "60 60 0 0" }}>
        <text style={{ color: "white", fontSize: 30, fontWeight: "semibold", backgroundColor: "rgba(0, 0, 0, 0.65)", padding: "20 24 8 24", tvAlign: "left" }}>
          {heading}
        </text>
        {recent.map((m) => (
          <text key={m.uri} style={{ color: "white", fontSize: 26, backgroundColor: "rgba(0, 0, 0, 0.65)", padding: "6 24", tvTextMaxLines: 3, tvAlign: "left" }}>
            {`@${m.handle}  ${m.text}`}
          </text>
        ))}
      </stack>
    </divTemplate>
  );
}

function LiveStream({
  did,
  live,
  name,
  title,
  thumb,
  profile,
  chat,
  onPlay,
  onCantPlay,
}: {
  did: string;
  live: Livestream;
  name: string;
  title: string;
  thumb: string;
  profile?: Profile;
  chat: { messages: Array<ChatMessage>; status: ChatStatus };
  onPlay(): void;
  onCantPlay(error: Error): void;
}) {
  const now = useNow();
  const [connecting, setConnecting] = useState(false);
  const activity = activityName(live.record.activity);
  const tags = (live.record.tags ?? []).filter((t) => !t.startsWith("lang:"));
  const messages = chat.messages;

  // Check the playlist first: a stream that just ended is a friendly alert
  // here rather than a player error.
  const watch = () => {
    setConnecting(true);
    checkPlayable(did)
      .then(onPlay, onCantPlay)
      .finally(() => setConnecting(false));
  };

  return (
    <productTemplate theme="dark">
      <background>
        <img src={thumb} />
      </background>
      <banner>
        <stack>
          <title>{title}</title>
          <row>
            <textBadge style={LIVE_BADGE}>LIVE</textBadge>
            <text>{viewers(live.viewerCount?.count)}</text>
            <text>{uptime(live.record.createdAt, now)}</text>
            {activity && <text>{activity}</text>}
          </row>
          <row>
            <text>{`${name} · @${live.author.handle}`}</text>
          </row>
          {profile?.description && <description>{profile.description}</description>}
          {tags.length > 0 && (
            <row>
              <text>{tags.slice(0, 4).map((tag) => `#${tag}`).join("  ")}</text>
            </row>
          )}
          <row>
            <buttonLockup onSelect={connecting ? undefined : watch}>
              <badge src="resource://button-play" />
              <title>{connecting ? "Connecting…" : "Watch"}</title>
            </buttonLockup>
          </row>
        </stack>
      </banner>
      {messages.length > 0 ? (
        <shelf>
          <header>
            <title>{chatHeading(chat.status, messages.length)}</title>
          </header>
          <section>
            {messages.map((m) => (
              <reviewCard key={m.uri}>
                <title>{`@${m.handle}`}</title>
                <description>{m.text}</description>
                <text>{ago(m.createdAt, now)}</text>
              </reviewCard>
            ))}
          </section>
        </shelf>
      ) : null}
      <MoreLive did={did} />
    </productTemplate>
  );
}

/** Other streams that are live now, from the home screen's list. */
function MoreLive({ did }: { did: string }) {
  const navigation = useNavigation();
  const { data: streams = [], dataUpdatedAt } = useScreenQuery(liveStreamsQuery);
  const version = Math.floor(dataUpdatedAt / LIVE_REFRESH_MS);
  const others = streams.filter((s) => s.author.did !== did);
  if (others.length === 0) return null;
  return (
    <shelf>
      <header>
        <title>More live streams</title>
      </header>
      <section>
        {others.map((stream) => (
          <lockup key={stream.author.did} onSelect={() => navigation.replace(<StreamScreen did={stream.author.did} />)}>
            <img src={thumbnailUrl(stream.author.did, version)} width={432} height={243} />
            <title>{oneLine(stream.record.title)}</title>
            <subtitle>{viewers(stream.viewerCount?.count)}</subtitle>
          </lockup>
        ))}
      </section>
    </shelf>
  );
}

export const LIVE_BADGE = { backgroundColor: "rgb(230, 30, 50)", color: "white", fontSize: 22, fontWeight: "bold", borderRadius: 6, padding: "4 10" } as const;

function chatHeading(status: ChatStatus, count: number): string {
  if (status === "unavailable") return "Chat is unavailable";
  if (status === "reconnecting") return count === 0 ? "Reconnecting to chat…" : "Recent chat · reconnecting…";
  if (count > 0) return "Recent chat";
  return status === "connecting" ? "Loading chat…" : "No chat messages yet";
}

function OfflineStreamer({
  did,
  profile,
  checking,
  onRefresh,
}: {
  did: string;
  profile?: Profile;
  checking: boolean;
  onRefresh(): void;
}) {
  const navigation = useNavigation();
  const handle = profile?.handle ?? did;
  const art = profile?.banner ?? profile?.avatar;
  return (
    <productTemplate theme="dark">
      <banner>
        <stack>
          <title>{profile?.displayName || `@${handle}`}</title>
          <row>
            <textBadge>OFFLINE</textBadge>
            <text>{`@${handle}`}</text>
          </row>
          <description>{profile?.description || "Not streaming right now."}</description>
          <row>
            <buttonLockup onSelect={checking ? undefined : onRefresh}>
              <badge src="resource://button-more" />
              <title>{checking ? "Checking…" : "Check Again"}</title>
            </buttonLockup>
            <buttonLockup onSelect={() => navigation.pop()}>
              <badge src="resource://button-remove" />
              <title>Back</title>
            </buttonLockup>
          </row>
        </stack>
        {art && <heroImg src={art} />}
      </banner>
    </productTemplate>
  );
}

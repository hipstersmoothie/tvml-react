import { createElement, useState, type ReactNode } from "react";
import { useKeepAwake, useNavigation, usePlayer, type TVMLAttributes } from "tvml-react";

import {
  activityName,
  checkPlayable,
  getLivestream,
  getRecentChat,
  playlistUrl,
  thumbnailUrl,
  type ChatMessage,
  type Livestream,
  type Profile,
} from "./api";
import { ago, oneLine, uptime, viewers } from "./format";
import { useLiveData, useNow, type Remote } from "./hooks";
import { attachOverlay, useChatOverlay } from "./playerOverlay";
import { useProfiles } from "./store";

const STREAM_REFRESH_MS = 15_000;
const CHAT_REFRESH_MS = 8_000;

// <reviewCard> is a built-in TVML element (product page shelves) that
// tvml-react's JSX catalog doesn't include yet.
function ReviewCard(props: TVMLAttributes) {
  return createElement("reviewCard", props);
}

export function StreamScreen({ did, initial }: { did: string; initial?: Livestream }) {
  const navigation = useNavigation();
  const player = usePlayer();
  const profile = useProfiles([did])[did];

  // The fullscreen player hides this screen, but the chat overlay drawn on
  // top of the video still needs fresh chat and viewer counts.
  const watching = player.state !== "idle" && player.state !== "end";
  useKeepAwake(watching);

  const stream = useLiveData(() => getLivestream(did), STREAM_REFRESH_MS, { keepAlive: watching });
  const live = stream.status === "ready" ? stream.data : initial;
  const chat = useLiveData(() => getRecentChat(did), CHAT_REFRESH_MS, { enabled: !!live, keepAlive: watching });

  // Rendered whatever this screen shows, so the overlay never goes blank
  // under a player that's still up (e.g. when the stream ends mid-watch).
  const overlay = useChatOverlay(
    chat.data ?? [],
    live === null ? "This stream has ended" : `Chat · ${viewers(live?.viewerCount?.count)}`,
  );

  let content: ReactNode;
  if (live === undefined) {
    content =
      stream.status === "error" ? (
        <alertTemplate theme="dark">
          <title>Couldn’t load this stream</title>
          <description>{stream.error.message}</description>
          <button onSelect={stream.refresh}>
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
    content = <OfflineStreamer did={did} profile={profile} onRefresh={stream.refresh} />;
  } else {
    const name = profile?.displayName || `@${live.author.handle}`;
    const title = oneLine(live.record.title);
    const thumb = thumbnailUrl(did, Math.floor((stream.updatedAt ?? 0) / STREAM_REFRESH_MS));
    const play = () => {
      player.play({
        url: playlistUrl(did),
        title,
        subtitle: `${name} · live on stream.place`,
        description: activityName(live.record.activity),
        artworkImageURL: thumb,
      });
      attachOverlay(overlay.doc);
    };
    const cantPlay = (error: Error) => {
      stream.refresh();
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
        profile={profile}
        chat={chat}
        onPlay={play}
        onCantPlay={cantPlay}
      />
    );
  }

  return (
    <>
      {content}
      {overlay.portal}
    </>
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
  chat: Remote<Array<ChatMessage>>;
  onPlay(): void;
  onCantPlay(error: Error): void;
}) {
  const now = useNow();
  const [connecting, setConnecting] = useState(false);
  const activity = activityName(live.record.activity);
  const tags = (live.record.tags ?? []).filter((t) => !t.startsWith("lang:"));
  const messages = chat.data ?? [];

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
      <banner>
        <infoList>
          <info>
            <header>
              <title>Streamer</title>
            </header>
            <text>{name}</text>
            <text>{`@${live.author.handle}`}</text>
          </info>
          {activity && (
            <info>
              <header>
                <title>Streaming</title>
              </header>
              <text>{activity}</text>
            </info>
          )}
          {tags.length > 0 && (
            <info>
              <header>
                <title>Tags</title>
              </header>
              {tags.slice(0, 4).map((tag) => (
                <text key={tag}>{`#${tag}`}</text>
              ))}
            </info>
          )}
        </infoList>
        <stack>
          <title>{title}</title>
          <row>
            <textBadge style={{ backgroundColor: "rgb(220, 38, 38)", color: "white" }}>LIVE</textBadge>
            <text>{viewers(live.viewerCount?.count)}</text>
            <text>{uptime(live.record.createdAt, now)}</text>
          </row>
          {profile?.description && <description>{profile.description}</description>}
          <row>
            <buttonLockup onSelect={connecting ? undefined : watch}>
              <badge src="resource://button-play" />
              <title>{connecting ? "Connecting…" : "Watch"}</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={thumb} />
      </banner>
      <shelf>
        <header>
          <title>{chatHeading(chat.status, messages.length)}</title>
        </header>
        <section>
          {messages.map((m) => (
            <ReviewCard key={m.uri}>
              <title>{`@${m.handle}`}</title>
              <description>{m.text}</description>
              <text>{ago(m.createdAt, now)}</text>
            </ReviewCard>
          ))}
        </section>
      </shelf>
    </productTemplate>
  );
}

function chatHeading(status: Remote<unknown>["status"], count: number): string {
  if (status === "loading") return "Loading chat…";
  if (status === "error") return "Chat is unavailable right now";
  return count === 0 ? "No chat messages yet" : "Recent chat";
}

function OfflineStreamer({
  did,
  profile,
  onRefresh,
}: {
  did: string;
  profile?: Profile;
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
            <buttonLockup onSelect={onRefresh}>
              <badge src="resource://button-more" />
              <title>Check Again</title>
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

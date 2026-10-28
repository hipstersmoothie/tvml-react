import { useState } from "react";
import { usePlayer, usePlayerEvent } from "tvml-react";

import { square, wide } from "./art";

// Screens for the remote-driven interaction tests (InteractionTests.swift).
// Each one reports what happened in its banner, where the tests read it.

// Which event each lockup got: select, play (the play/pause button),
// holdselect (a long press) and highlight (focus).
export function EventsScreen() {
  const [last, setLast] = useState("none");
  return (
    <stackTemplate>
      <banner>
        <title>{`Last event: ${last}`}</title>
      </banner>
      <collectionList>
        <shelf>
          <section>
            {["A", "B"].map((name) => (
              <lockup
                key={name}
                onSelect={() => setLast(`select ${name}`)}
                onPlay={() => setLast(`play ${name}`)}
                onHoldSelect={() => setLast(`holdselect ${name}`)}
                onHighlight={() => setLast(`highlight ${name}`)}
              >
                <img src={wide(`ev${name}`)} width={400} height={225} />
                <title>{`Lockup ${name}`}</title>
              </lockup>
            ))}
          </section>
        </shelf>
      </collectionList>
    </stackTemplate>
  );
}

const SONG = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const CLIP =
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8";

// The shared player (PlayerProvider in main.tsx). The metadata is what AVKit
// publishes to Now Playing.
export function PlayerScreen() {
  const player = usePlayer();
  const [ended, setEnded] = useState("none");
  usePlayerEvent("itemEnd", (event) => setEnded(`${event.item.title} (${event.reason})`));

  return (
    <stackTemplate>
      <banner>
        <title>{`Player: ${player.state} t=${Math.round(player.currentTime)}`}</title>
        <description>{`Last ended: ${ended}`}</description>
      </banner>
      <collectionList>
        <shelf>
          <section>
            <lockup
              onSelect={() =>
                player.play({
                  type: "audio",
                  url: SONG,
                  title: "Kitchen Sink Song",
                  subtitle: "SoundHelix",
                  artworkImageURL: square("song"),
                })
              }
            >
              <img src={square("song")} width={300} height={300} />
              <title>Play audio</title>
            </lockup>
            <lockup
              onSelect={() =>
                player.play({
                  url: CLIP,
                  title: "Kitchen Sink Clip",
                  subtitle: "Apple sample stream",
                  artworkImageURL: wide("clip"),
                })
              }
            >
              <img src={wide("clip")} width={533} height={300} />
              <title>Play video</title>
            </lockup>
            {/* Menu during audio returns here with the audio still playing. */}
            <lockup onSelect={() => player.present()}>
              <img src="symbol://play.rectangle" width={300} height={300} />
              <title>Show player</title>
            </lockup>
            <lockup onSelect={() => player.stop()}>
              <img src="symbol://stop.fill" width={300} height={300} />
              <title>Stop</title>
            </lockup>
          </section>
        </shelf>
      </collectionList>
    </stackTemplate>
  );
}

// Artwork shown while audio plays. Audio MediaItems otherwise play over a plain
// black screen; the transport bar already shows the title and show name (from
// the MediaItem's title/subtitle), so this only adds the artwork above it.

import { PlayerOverlay, useTraitCollection } from "tvml-react";

const SIZE = 540;

export function NowPlayingOverlay({ artwork }: { artwork: string }) {
  // divTemplate is manual layout: `tv-position: top` pins to the left edge, so
  // centre by hand.
  const { screenWidth } = useTraitCollection();
  return (
    <PlayerOverlay>
      <divTemplate>
        <img
          src={artwork}
          style={{
            tvPosition: "top-left",
            margin: `130 0 0 ${(screenWidth - SIZE) / 2}`,
            width: SIZE,
            height: SIZE,
          }}
        />
      </divTemplate>
    </PlayerOverlay>
  );
}

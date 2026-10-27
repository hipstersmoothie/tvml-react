// Artwork shown while audio plays. Audio MediaItems otherwise play over a plain
// black screen; the transport bar already shows the title and show name (from
// the MediaItem's title/subtitle), so this only adds the artwork above it.
// Rendered with createPortal into a standalone document that's handed to the
// TVJS Player as its `overlayDocument`.

import { useTraitCollection } from "tvml-react";

import type { Episode, Podcast } from "./types";

const SIZE = 540;

export function NowPlayingOverlay({
  nowPlaying,
}: {
  nowPlaying: { episode: Episode; podcast: Podcast } | null;
}) {
  // The document must never be empty: TVMLKit ignores later mutations to a
  // document that was blank when first shown.
  // divTemplate is manual layout: `tv-position: top` pins to the left edge, so
  // centre by hand.
  const { screenWidth } = useTraitCollection();
  const artwork = nowPlaying ? nowPlaying.episode.artwork || nowPlaying.podcast.artwork : "";
  return (
    <divTemplate>
      <img
        src={artwork || undefined}
        style={{
          tvPosition: "top-left",
          margin: `130 0 0 ${(screenWidth - SIZE) / 2}`,
          width: SIZE,
          height: SIZE,
        }}
      />
    </divTemplate>
  );
}

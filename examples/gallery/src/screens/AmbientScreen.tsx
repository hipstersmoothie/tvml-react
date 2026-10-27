import { useEffect, useState } from "react";
import { useIsScreenVisible, useKeepAwake } from "tvml-react";

import { imageUrl, type Artwork } from "../api";
import { useScreenScale } from "../hooks";

const INTERVAL_MS = 10_000;
/** The bottom of the screen is left for the caption. */
const IMAGE_HEIGHT = 820;

/**
 * A screensaver-style slideshow rendered with React: a full-screen image that
 * advances on a timer, with a caption. Keeps the Apple TV awake while it's on
 * screen, and pauses when another screen covers it.
 */
export function AmbientScreen({ items, startIndex = 0 }: { items: Array<Artwork>; startIndex?: number }) {
  const [index, setIndex] = useState(startIndex);
  const visible = useIsScreenVisible();
  const scale = useScreenScale();
  useKeepAwake(visible);

  useEffect(() => {
    if (!visible || items.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [visible, items.length]);

  const current = items[index % items.length];
  const next = items[(index + 1) % items.length];
  const url = (a: Artwork) => imageUrl(a, 1920 * scale, IMAGE_HEIGHT * scale);

  return (
    <divTemplate theme="dark">
      {/* divTemplate ignores the width/height attributes and mis-centers
          `tv-position: center`; a full-width box from the top-left works. */}
      <img
        src={url(current)}
        style={{ width: 1920, height: IMAGE_HEIGHT, margin: "30 0 0 0", tvPosition: "top-left" }}
        accessibilityText={`${current.title}, ${current.artist}`}
      />
      {/* Fetch the next slide ahead of time. */}
      <img src={url(next)} style={{ width: 1, height: 1, tvPosition: "top-left" }} />
      <text
        style={{
          tvPosition: "bottom-left",
          margin: "0 0 82 90",
          color: "rgba(255, 255, 255, 0.92)",
          fontSize: 38,
          fontWeight: "medium",
          width: 1740,
          tvTextMaxLines: 1,
        }}
      >
        {current.title}
      </text>
      <text
        style={{
          tvPosition: "bottom-left",
          margin: "0 0 40 90",
          color: "rgba(255, 255, 255, 0.6)",
          fontSize: 28,
          width: 1740,
          tvTextMaxLines: 1,
        }}
      >
        {[current.artist, current.date].filter(Boolean).join(" · ")}
      </text>
    </divTemplate>
  );
}

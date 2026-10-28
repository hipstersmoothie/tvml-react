import { useEffect, useState } from "react";
import { useIsScreenVisible, useKeepAwake } from "tvml-react";
import { Cell, CONTENT_WIDTH, Image, Row, Screen, SCREEN_WIDTH } from "tvml-react/layout";

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
    <Screen theme="dark">
      <Row region="top" bleed marginTop={30}>
        <Image
          src={url(current)}
          width={SCREEN_WIDTH}
          height={IMAGE_HEIGHT}
          accessibilityText={`${current.title}, ${current.artist}`}
        />
      </Row>
      {/* Fetch the next slide ahead of time. */}
      <img src={url(next)} style={{ width: 1, height: 1, tvPosition: "top-left" }} />
      <Row region="bottom">
        <Cell width={CONTENT_WIDTH} size={38} weight="medium" color="rgba(255, 255, 255, 0.92)">
          {current.title}
        </Cell>
      </Row>
      <Row region="bottom" marginBottom={40}>
        <Cell width={CONTENT_WIDTH} size={28} color="rgba(255, 255, 255, 0.6)">
          {[current.artist, current.date].filter(Boolean).join(" · ")}
        </Cell>
      </Row>
    </Screen>
  );
}

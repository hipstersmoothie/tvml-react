import { useState } from "react";
import { measureText } from "tvml-react";
import { Avatar, Backdrop, Card, QRCode } from "tvml-react/native";

import { ALBUMS, artwork } from "./data";

const REPO = "https://github.com/hipstersmoothie/tvml-react";

// The native view elements from the TVMLReactExtras Swift package. Each is a
// leaf that draws itself; TVMLKit places it by its style.
export function Elements() {
  const [album] = useState(() => ALBUMS[Math.floor(Math.random() * ALBUMS.length)]);
  const heading = "Native elements";
  // measureText sizes a cell to its text (TVML has no intrinsic sizing).
  const { width } = measureText(heading, { fontSize: 60, fontWeight: "semibold" });

  return (
    <>
      {/* Unlike <background>, a Backdrop can change after the screen is shown. */}
      <Backdrop src={artwork(album).replace("400/400", "1920/1080")} dim={0.5} />
      <text
        style={{
          tvPosition: "top",
          margin: "180 0 0 0",
          width,
          color: "white",
          fontSize: 60,
          fontWeight: "semibold",
        }}
      >
        {heading}
      </text>
      <Card
        style={{ tvPosition: "center", width: 900, height: 280 }}
        title={album.title}
        subtitle={`${album.artist} · ${album.year}`}
        body="A blurred, rounded card drawn natively, with its own image and text."
        image={artwork(album)}
      />
      <Avatar
        style={{ tvPosition: "bottom-left", width: 160, height: 160, margin: "0 0 90 140" }}
        name={album.artist}
      />
      <QRCode
        style={{ tvPosition: "bottom-right", width: 220, height: 220, margin: "0 140 90 0" }}
        value={REPO}
      />
    </>
  );
}

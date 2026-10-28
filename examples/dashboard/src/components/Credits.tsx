import { Cell, CONTENT_WIDTH, Row, SAFE_Y } from "tvml-react/layout";

import { usePalette } from "../theme";

export function Credits({ updated }: { updated: string | undefined }) {
  const palette = usePalette();
  const parts = ["Weather by Open-Meteo.com", "Photos from Unsplash via Picsum", "On this day from Wikipedia"];
  if (updated) parts.push(`Updated ${updated}`);
  return (
    <Row region="bottom" marginTop={16} marginBottom={SAFE_Y}>
      <Cell width={CONTENT_WIDTH} align="right" size={20} color={palette.tertiary}>
        {parts.join("  ·  ")}
      </Cell>
    </Row>
  );
}

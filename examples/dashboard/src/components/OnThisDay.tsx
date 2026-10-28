import { Cell, Row } from "tvml-react/layout";

import type { HistoricalEvent } from "../hooks/useOnThisDay";
import { usePalette } from "../theme";

const WIDTH = 1560;

export function OnThisDay({ event }: { event: HistoricalEvent | undefined }) {
  const palette = usePalette();
  if (!event) return null;

  return (
    <>
      <Row region="center" align="center">
        <Cell width={WIDTH} height={52} align="center" inset={48} size={24} weight="semibold" color={palette.accent} background={palette.panel}>
          {`ON THIS DAY · ${event.year}`}
        </Cell>
      </Row>
      <Row region="center" align="center">
        <Cell width={WIDTH} height={118} align="center" inset={48} size={36} lines={2} color={palette.text} background={palette.panel}>
          {event.text}
        </Cell>
      </Row>
    </>
  );
}

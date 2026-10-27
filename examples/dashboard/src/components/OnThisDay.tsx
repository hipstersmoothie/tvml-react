import type { HistoricalEvent } from "../hooks/useOnThisDay";
import { Cell, Row } from "../layout";
import { usePalette } from "../theme";

const WIDTH = 1300;

export function OnThisDay({ event }: { event: HistoricalEvent | undefined }) {
  const palette = usePalette();
  if (!event) return null;

  return (
    <>
      <Row region="center">
        <Cell width={WIDTH} height={52} align="center" size={24} weight="semibold" color={palette.accent} background={palette.panel}>
          {`ON THIS DAY · ${event.year}`}
        </Cell>
      </Row>
      <Row region="center">
        <Cell width={WIDTH} height={118} align="center" size={36} lines={2} color={palette.text} background={palette.panel}>
          {event.text}
        </Cell>
      </Row>
    </>
  );
}

import { Cell, Columns, CONTENT_WIDTH, Image, Row, Screen } from "tvml-react/layout";

import { square } from "./art";

const PANEL = "rgba(255, 255, 255, 0.12)";

// tvml-react/layout: rows in every region, alignment within the safe area,
// cells sized to their text, columns and image cells.
export function LayoutScreen() {
  return (
    <Screen>
      <Row region="header" align="center" marginTop={40}>
        <Cell size={24} color="rgba(255, 255, 255, 0.6)">
          header region
        </Cell>
      </Row>
      <Row region="top" marginTop={20}>
        <Cell size={60} weight="semibold">
          Layout
        </Cell>
      </Row>
      <Row region="top" gap={12} marginTop={20}>
        <Cell size={30} background={PANEL} height={60} align="center" width={300}>
          left
        </Cell>
        <Cell size={30} background={PANEL} height={60}>
          {" sized to its text "}
        </Cell>
      </Row>
      <Row region="top" align="center" marginTop={12}>
        <Cell size={30} background={PANEL} height={60} width={300} align="center">
          center
        </Cell>
      </Row>
      <Row region="top" align="right" marginTop={12}>
        <Cell size={30} background={PANEL} height={60} width={300} align="center">
          right
        </Cell>
      </Row>
      <Columns
        region="center"
        gap={8}
        columns={["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => ({
          key: day,
          width: 160,
          background: i === 0 ? "rgba(255, 255, 255, 0.25)" : undefined,
          lines: [day, "☀️", `${20 + i}°`],
        }))}
        lineStyles={[
          { size: 26, background: PANEL, height: 50 },
          { size: 50, background: PANEL, height: 80 },
          { size: 34, background: PANEL, height: 56 },
        ]}
      />
      <Row region="bottom" gap={24} marginBottom={20}>
        <Image src={square("layout")} width={120} height={120} />
        <Cell size={34} weight="medium" width={CONTENT_WIDTH - 120 - 24 - 400 - 24}>
          An image cell beside text
        </Cell>
        <Cell size={28} align="right" width={400} color="rgba(255, 255, 255, 0.6)">
          right edge of the safe area
        </Cell>
      </Row>
      <Row region="footer" align="center" marginBottom={40}>
        <Cell size={24} color="rgba(255, 255, 255, 0.6)">
          footer region
        </Cell>
      </Row>
    </Screen>
  );
}

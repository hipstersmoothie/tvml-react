import { Cell, Row, Screen } from "tvml-react/layout";

const PANEL = "rgba(255, 255, 255, 0.12)";

export default function Cells() {
  return (
    <Screen>
      <Row region="top" marginTop={60}>
        <Cell size={96} weight="thin">12:41</Cell>
      </Row>
      <Row region="top" marginTop={20} gap={16}>
        <Cell size={34} weight="semibold">Sized to its text</Cell>
        <Cell size={34} width={500} align="center" background={PANEL} height={64}>
          500 points, centered
        </Cell>
        <Cell size={34} width={400} align="right" color="#9a9a9e">
          right-aligned
        </Cell>
      </Row>
      <Row region="center">
        <Cell size={30} width={900} lines={3} background={PANEL}>
          {"Cells truncate to one line unless you give them more. This one has three lines, so a longer description wraps instead of being cut off with an ellipsis."}
        </Cell>
      </Row>
    </Screen>
  );
}

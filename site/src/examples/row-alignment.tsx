import { Cell, Row, Screen } from "tvml-react/layout";

const PANEL = "rgba(255, 255, 255, 0.12)";

export default function Alignment() {
  return (
    <Screen>
      <Row region="top" gap={12} marginTop={40}>
        <Cell width={300} height={60} align="center" size={30} background={PANEL}>left</Cell>
        <Cell height={60} size={30} background={PANEL}>{" sized to its text "}</Cell>
      </Row>
      <Row region="top" align="center" marginTop={12}>
        <Cell width={300} height={60} align="center" size={30} background={PANEL}>center</Cell>
      </Row>
      <Row region="top" align="right" marginTop={12}>
        <Cell width={300} height={60} align="center" size={30} background={PANEL}>right</Cell>
      </Row>
    </Screen>
  );
}

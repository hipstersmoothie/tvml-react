import { Cell, Row, Screen } from "tvml-react/layout";
import { Backdrop } from "tvml-react/native";

export default function Featured() {
  return (
    <Screen>
      <Backdrop src="https://picsum.photos/seed/tvml-backdrop/1920/1080" dim={0.45} />
      <Row region="bottom">
        <Cell size={72} weight="bold">Northern Lights</Cell>
      </Row>
      <Row region="bottom" marginBottom={80}>
        <Cell size={32} color="rgba(255, 255, 255, 0.75)">A documentary · 2026 · 1h 32m</Cell>
      </Row>
    </Screen>
  );
}

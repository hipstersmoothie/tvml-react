import { Cell, CONTENT_WIDTH, Row, Screen, Spacer } from "tvml-react/layout";

export default function Header() {
  return (
    <Screen>
      <Row region="top" marginTop={60}>
        <Cell size={56} weight="bold" width={600}>Now Playing</Cell>
        <Spacer width={CONTENT_WIDTH - 600 - 300} />
        <Cell size={40} width={300} align="right" color="#9a9a9e">12:41</Cell>
      </Row>
    </Screen>
  );
}

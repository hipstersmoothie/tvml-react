import { Cell, Row, Screen } from "tvml-react/layout";

const photo = "https://picsum.photos/seed/tvml-ambient/1920/1080";

export default function Ambient() {
  return (
    <Screen theme="dark" background={photo}>
      <Row region="header" align="center" marginTop={40}>
        <Cell size={24} color="rgba(255, 255, 255, 0.6)">header region</Cell>
      </Row>
      <Row region="bottom" marginBottom={60}>
        <Cell size={48} weight="semibold">Good evening</Cell>
      </Row>
    </Screen>
  );
}

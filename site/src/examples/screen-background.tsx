import { Cell, Row, Screen } from "tvml-react/layout";

export default function Ambient({ photo }: { photo: string }) {
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

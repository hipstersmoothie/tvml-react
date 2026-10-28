import { Cell, Row, Screen } from "tvml-react/layout";
import { QRCode } from "tvml-react/native";

export default function SignIn() {
  return (
    <Screen>
      <Row region="top" align="center" marginTop={140}>
        <Cell size={56} weight="bold">Sign in on your phone</Cell>
      </Row>
      <Row region="top" align="center" marginTop={12}>
        <Cell size={30} color="#9a9a9e">Scan the code, or go to example.com/tv</Cell>
      </Row>
      <QRCode value="https://example.com/tv?code=4F7Q" position="center" style={{ width: 360, height: 360 }} />
    </Screen>
  );
}

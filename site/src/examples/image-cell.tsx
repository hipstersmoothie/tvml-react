import { Cell, CONTENT_WIDTH, Image, Row, Screen } from "tvml-react/layout";

export default function Caption({ artwork }: { artwork: string }) {
  return (
    <Screen>
      <Row region="bottom" gap={24} marginBottom={60}>
        <Image src={artwork} width={120} height={120} />
        <Cell size={34} weight="medium" width={CONTENT_WIDTH - 120 - 24 - 400 - 24}>
          An image cell beside text
        </Cell>
        <Cell size={28} align="right" width={400} color="rgba(255, 255, 255, 0.6)">
          right edge of the safe area
        </Cell>
      </Row>
    </Screen>
  );
}

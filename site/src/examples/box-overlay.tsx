import { Box, Cell, Image, Row, Screen } from "tvml-react/layout";

export default function LiveTile({ still }: { still: string }) {
  return (
    <Screen>
      <Row region="bottom" align="center" marginBottom={60}>
        <Box width={640} height={360}>
          <Image src={still} width={640} height={360} position="top-left" />
          <Cell size={32} weight="semibold" position="bottom-left">
            Caption over the image
          </Cell>
          <Cell size={22} weight="bold" position="top-right" background="rgba(220, 0, 0, 0.9)">
            LIVE
          </Cell>
        </Box>
      </Row>
    </Screen>
  );
}

import { Cell, Image, Row, Screen, Stack } from "tvml-react/layout";

export default function NowPlaying({ artwork }: { artwork: string }) {
  return (
    <Screen>
      <Row region="top" gap={40}>
        <Image src={artwork} width={160} height={160} />
        <Stack gap={10} width={1000}>
          <Cell size={56} weight="semibold">Stacks and boxes</Cell>
          <Cell size={34} color="#999">A Stack is a column that can sit in a row</Cell>
        </Stack>
        <Stack align="right" width={500}>
          <Cell size={30}>right-aligned</Cell>
          <Cell size={26} color="#999">3:42 of 5:10</Cell>
        </Stack>
      </Row>
    </Screen>
  );
}

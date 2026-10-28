import { Box, Cell, Image, Row, Screen, Stack } from "tvml-react/layout";

import { square, wide } from "./art";

const DIM = "rgba(255, 255, 255, 0.55)";

// tvml-react/layout's organizer-based pieces: Stack (a column inside a row)
// and Box (children placed by position).
export function OrganizerScreen() {
  return (
    <Screen>
      {/* Artwork beside a title and subtitle, with right-aligned details. */}
      <Row region="top" gap={40} marginTop={50}>
        <Image src={square("org")} width={160} height={160} />
        <Stack gap={10} width={1000}>
          <Cell size={56} weight="semibold">
            Stacks and boxes
          </Cell>
          <Cell size={34} color={DIM}>
            A Stack is a column that can sit in a row
          </Cell>
        </Stack>
        <Stack align="right" gap={6} width={500}>
          <Cell size={30}>right-aligned</Cell>
          <Cell size={26} color={DIM}>
            3:42 of 5:10
          </Cell>
        </Stack>
      </Row>
      {/* Forecast columns, centered text. */}
      <Row region="center" align="center" gap={16}>
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
          <Stack key={day} width={140} align="center" gap={12}>
            <Cell size={26} color={DIM}>
              {day}
            </Cell>
            <Cell size={52}>{["☀️", "⛅️", "🌧", "☀️", "❄️"][i]}</Cell>
            <Cell size={34}>{`${18 + i}°`}</Cell>
          </Stack>
        ))}
      </Row>
      {/* Boxes: a caption and badge over an image, and the edge positions. */}
      <Row region="bottom" align="center" gap={60} marginBottom={60}>
        <Box width={640} height={360}>
          <Image src={wide("orgbox")} width={640} height={360} position="top-left" />
          <Cell size={32} weight="semibold" position="bottom-left">
            Caption over the image
          </Cell>
          <Cell size={22} weight="bold" position="top-right" background="rgba(220, 0, 0, 0.9)">
            LIVE
          </Cell>
        </Box>
        <Box width={480} height={360}>
          <Cell size={26} position="top">
            top
          </Cell>
          <Cell size={26} position="left">
            left
          </Cell>
          <Cell size={26} position="center">
            center
          </Cell>
          <Cell size={26} position="right">
            right
          </Cell>
          <Cell size={26} position="bottom">
            bottom
          </Cell>
        </Box>
      </Row>
    </Screen>
  );
}

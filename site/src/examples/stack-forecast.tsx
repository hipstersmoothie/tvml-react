import { Cell, Row, Screen, Stack } from "tvml-react/layout";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function Week() {
  return (
    <Screen>
      <Row region="center" align="center" gap={16}>
        {DAYS.map((day, i) => (
          <Stack key={day} width={140} align="center" gap={12}>
            <Cell size={26} color="rgba(255, 255, 255, 0.55)">{day}</Cell>
            <Cell size={52}>{["☀️", "⛅️", "🌧", "☀️", "❄️"][i]}</Cell>
            <Cell size={34}>{`${18 + i}°`}</Cell>
          </Stack>
        ))}
      </Row>
    </Screen>
  );
}

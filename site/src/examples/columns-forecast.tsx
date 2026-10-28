import { Columns, Screen } from "tvml-react/layout";

const PANEL = "rgba(255, 255, 255, 0.12)";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function Forecast() {
  return (
    <Screen>
      <Columns
        region="center"
        gap={8}
        columns={DAYS.map((day, i) => ({
          key: day,
          width: 160,
          background: i === 0 ? "rgba(255, 255, 255, 0.25)" : undefined,
          lines: [day, "☀️", `${20 + i}°`],
        }))}
        lineStyles={[
          { size: 26, background: PANEL, height: 50 },
          { size: 50, background: PANEL, height: 80 },
          { size: 34, background: PANEL, height: 56 },
        ]}
      />
    </Screen>
  );
}

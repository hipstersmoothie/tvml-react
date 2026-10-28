import { Screen } from "tvml-react/layout";
import { Backdrop, Card } from "tvml-react/native";

export default function UpNext() {
  return (
    <Screen>
      <Backdrop src="https://picsum.photos/seed/tvml-upnext/1920/1080" dim={0.2} />
      <Card
        title="Up next"
        subtitle="Episode 4 · The Long Way Home"
        body="The crew reaches the harbor just as the storm turns, and an old friend has news."
        image="https://picsum.photos/seed/tvml-ep4/300/300"
        position="bottom-right"
        style={{ width: 760, height: 220, margin: "0 90 80 0" }}
      />
    </Screen>
  );
}

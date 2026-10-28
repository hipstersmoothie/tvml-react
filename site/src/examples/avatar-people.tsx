import { Cell, Row, Screen, Stack } from "tvml-react/layout";
import { Avatar } from "tvml-react/native";

const PEOPLE = [
  { name: "Ada", photo: "https://picsum.photos/seed/tvml-ada/300/300" },
  { name: "Alan", photo: "https://picsum.photos/seed/tvml-alan/300/300" },
  { name: "Grace Hopper" },
];

export default function WhosWatching() {
  return (
    <Screen>
      <Row region="center" align="center">
        <Cell size={56} weight="bold">Who's watching?</Cell>
      </Row>
      {/* Native elements don't render inside a row; a Stack holds each one. */}
      <Row region="center" align="center" gap={80} marginTop={60}>
        {PEOPLE.map((person) => (
          <Stack key={person.name} width={240} align="center" gap={16}>
            <Avatar src={person.photo} name={person.name} style={{ width: 240, height: 240 }} />
            <Cell size={32}>{person.name.split(" ")[0]}</Cell>
          </Stack>
        ))}
      </Row>
    </Screen>
  );
}

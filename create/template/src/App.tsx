import { useNavigation } from "tvml-react";

const ITEMS = ["Mountains", "Ocean", "Forest", "Desert", "City", "Snow"];
const image = (seed: string) => `https://picsum.photos/seed/${seed}/400/600`;

// The first screen: a shelf of items. Selecting one pushes its detail screen;
// the remote's Menu button goes back.
export function App() {
  const navigation = useNavigation();
  return (
    <stackTemplate>
      <banner>
        <title>__APP__</title>
      </banner>
      <collectionList>
        <shelf>
          <section>
            {ITEMS.map((item) => (
              <lockup key={item} onSelect={() => navigation.push(<Detail item={item} />)}>
                <img src={image(item)} width={250} height={375} />
                <title>{item}</title>
              </lockup>
            ))}
          </section>
        </shelf>
      </collectionList>
    </stackTemplate>
  );
}

function Detail({ item }: { item: string }) {
  const navigation = useNavigation();
  return (
    <productTemplate>
      <banner>
        <stack>
          <title>{item}</title>
          <description>Edit src/App.tsx; the app reloads when you save.</description>
          <row>
            <buttonLockup onSelect={() => navigation.pop()}>
              <badge src="resource://button-remove" />
              <title>Back</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={image(item)} />
      </banner>
    </productTemplate>
  );
}

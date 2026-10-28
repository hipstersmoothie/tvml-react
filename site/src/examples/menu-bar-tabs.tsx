import { MenuBar, MenuBarItem } from "tvml-react";

const poster = (seed: string) => `https://picsum.photos/seed/tvml-${seed}/400/600`;

function Shelf({ title, seeds }: { title: string; seeds: Array<string> }) {
  return (
    <stackTemplate>
      <collectionList>
        <shelf>
          <header>
            <title>{title}</title>
          </header>
          <section>
            {seeds.map((seed) => (
              <lockup key={seed}>
                <img src={poster(seed)} width={250} height={375} />
                <title>{seed}</title>
              </lockup>
            ))}
          </section>
        </shelf>
      </collectionList>
    </stackTemplate>
  );
}

export default function Tabs() {
  return (
    <menuBarTemplate>
      <MenuBar>
        <MenuBarItem id="home" title="Home">
          <Shelf title="Continue Watching" seeds={["Tides", "Summit", "Harbor", "Meadow", "Canyon", "Aurora"]} />
        </MenuBarItem>
        <MenuBarItem id="movies" title="Movies">
          <Shelf title="New Releases" seeds={["Drift", "Ember", "Glacier"]} />
        </MenuBarItem>
        <MenuBarItem id="search" title="Search">
          <Shelf title="Popular" seeds={["Lantern", "Orbit"]} />
        </MenuBarItem>
      </MenuBar>
    </menuBarTemplate>
  );
}

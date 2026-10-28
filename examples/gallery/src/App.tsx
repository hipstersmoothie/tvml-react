import { MenuBar, MenuBarItem } from "tvml-react";

import { BrowseScreen } from "./screens/BrowseScreen";
import { CollectionsScreen } from "./screens/CollectionsScreen";
import { FavoritesScreen } from "./screens/FavoritesScreen";
import { SearchScreen } from "./screens/SearchScreen";

function HighlightsScreen() {
  return <BrowseScreen title="Highlights" heading="From the Art Institute of Chicago" showTitle={false} query={{}} />;
}

export function App() {
  return (
    <menuBarTemplate theme="dark">
      <MenuBar>
        <MenuBarItem id="highlights" title="Highlights">
          <HighlightsScreen />
        </MenuBarItem>
        <MenuBarItem id="collections" title="Collections">
          <CollectionsScreen />
        </MenuBarItem>
        <MenuBarItem id="favorites" title="Favorites">
          <FavoritesScreen />
        </MenuBarItem>
        <MenuBarItem id="search" title="Search">
          <SearchScreen />
        </MenuBarItem>
      </MenuBar>
    </menuBarTemplate>
  );
}

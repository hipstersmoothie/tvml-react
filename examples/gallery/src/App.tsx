import { MenuBar, MenuBarItem, useNavigation } from "tvml-react";

import { useFavorites } from "./hooks";
import { AmbientScreen } from "./screens/AmbientScreen";
import { BrowseScreen } from "./screens/BrowseScreen";
import { CollectionsScreen } from "./screens/CollectionsScreen";
import { FavoritesScreen } from "./screens/FavoritesScreen";
import { SearchScreen } from "./screens/SearchScreen";

function HighlightsScreen() {
  return (
    <BrowseScreen
      title="Highlights"
      showTitle={false}
      query={{}}
      actions={<HighlightsActions />}
    />
  );
}

function HighlightsActions() {
  const navigation = useNavigation();
  const { favorites } = useFavorites();
  return (
    <row>
      <buttonLockup
        disabled={favorites.length === 0}
        onSelect={() => navigation.push(<AmbientScreen items={favorites} />)}
      >
        <badge src="resource://button-play" />
        <title>Ambient</title>
      </buttonLockup>
    </row>
  );
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

import { useNavigation } from "tvml-react";

import { MenuBar, type Tab } from "./components/MenuBar";
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

const TABS: Array<Tab> = [
  { id: "highlights", title: "Highlights", render: () => <HighlightsScreen /> },
  { id: "collections", title: "Collections", render: () => <CollectionsScreen /> },
  { id: "favorites", title: "Favorites", render: () => <FavoritesScreen /> },
  { id: "search", title: "Search", render: () => <SearchScreen /> },
];

export function App() {
  return <MenuBar tabs={TABS} />;
}

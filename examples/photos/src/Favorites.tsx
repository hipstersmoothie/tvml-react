import { Cell, Row, Screen } from "tvml-react/layout";

import { useFavorites } from "./useFavorites";
import { PhotoGrid } from "./PhotoGrid";

export function Favorites() {
  const { favorites } = useFavorites();

  if (favorites.length === 0) {
    return (
      <Screen>
        <Row region="center" align="center">
          <Cell size={48} weight="semibold">No favorites yet</Cell>
        </Row>
        <Row region="center" align="center" marginTop={16}>
          <Cell size={30} color="rgba(255, 255, 255, 0.6)">
            Open a photo and choose Favorite.
          </Cell>
        </Row>
      </Screen>
    );
  }

  return <PhotoGrid photos={favorites} />;
}

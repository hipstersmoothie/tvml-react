import { useNavigation } from "tvml-react";

import { imageUrl } from "../api";
import { ArtworkGrid } from "../components/ArtworkGrid";
import { useFavorites, useScreenScale } from "../hooks";
import { startSlideshow } from "../slideshow";
import { AmbientScreen } from "./AmbientScreen";

/** Saved artworks (TVJS localStorage), plus slideshows of them. */
export function FavoritesScreen() {
  const navigation = useNavigation();
  const { favorites } = useFavorites();
  const scale = useScreenScale();

  if (favorites.length === 0) {
    return (
      <alertTemplate theme="dark">
        <title>No favorites yet</title>
        <description>
          Press and hold on any artwork, or choose Favorite on its page, to save it here.
        </description>
      </alertTemplate>
    );
  }

  return (
    <stackTemplate theme="dark">
      <banner>
        <title>Favorites</title>
        <description>{`${favorites.length} saved · hold to remove`}</description>
        <row>
          <buttonLockup onSelect={() => navigation.push(<AmbientScreen items={favorites} />)}>
            <badge src="resource://button-play" />
            <title>Ambient</title>
          </buttonLockup>
          <buttonLockup
            onSelect={() =>
              startSlideshow(
                favorites.map((a) => imageUrl(a, 1920 * scale, 1080 * scale)),
                { showSettings: true },
              )
            }
          >
            <badge src="resource://button-shuffle" />
            <title>Slideshow</title>
          </buttonLockup>
        </row>
      </banner>
      <collectionList>
        <ArtworkGrid items={favorites} />
      </collectionList>
    </stackTemplate>
  );
}

import { memo, useCallback, useRef } from "react";
import { useNavigation } from "tvml-react";

import type { Artwork } from "../api";
import { useArtworkImage, useFavorites } from "../hooks";
import { ArtworkScreen } from "../screens/ArtworkScreen";

/** Grid cell size in points. */
export const CELL = { width: 300, height: 300 };

/** Start fetching the next page when focus gets this close to the end. */
const PREFETCH_DISTANCE = 15;

interface ArtworkGridProps {
  items: Array<Artwork>;
  title?: string;
  /** Called when focus nears the end of `items`. */
  onEndReached?: () => void;
}

/**
 * A `<grid>` of artwork lockups. Select opens the artwork, long-press toggles
 * it as a favorite. Cells are memoized so appending a page only creates the
 * new lockups instead of re-rendering every existing one.
 */
export function ArtworkGrid({ items, title, onEndReached }: ArtworkGridProps) {
  const navigation = useNavigation();
  const { isFavorite, toggle } = useFavorites();

  // Read through refs so the callbacks stay stable as pages arrive.
  const latest = useRef({ items, onEndReached });
  latest.current = { items, onEndReached };

  const open = useCallback(
    (index: number) => {
      const { items } = latest.current;
      navigation.push(<ArtworkScreen artwork={items[index]} collection={items} />);
    },
    [navigation],
  );

  const highlight = useCallback((index: number) => {
    const { items, onEndReached } = latest.current;
    if (index >= items.length - PREFETCH_DISTANCE) onEndReached?.();
  }, []);

  return (
    <grid>
      {title ? (
        <header>
          <title>{title}</title>
        </header>
      ) : null}
      <section>
        {items.map((artwork, index) => (
          <ArtworkCell
            key={artwork.id}
            artwork={artwork}
            index={index}
            favorite={isFavorite(artwork.id)}
            onOpen={open}
            onHighlight={highlight}
            onToggleFavorite={toggle}
          />
        ))}
      </section>
    </grid>
  );
}

interface ArtworkCellProps {
  artwork: Artwork;
  index: number;
  favorite: boolean;
  onOpen(index: number): void;
  onHighlight(index: number): void;
  onToggleFavorite(artwork: Artwork): void;
}

export const ArtworkCell = memo(function ArtworkCell({
  artwork,
  index,
  favorite,
  onOpen,
  onHighlight,
  onToggleFavorite,
}: ArtworkCellProps) {
  const image = useArtworkImage(artwork, CELL.width, CELL.height, "cover");
  return (
    <lockup
      onSelect={() => onOpen(index)}
      onHighlight={() => onHighlight(index)}
      onHoldSelect={() => onToggleFavorite(artwork)}
      accessibilityText={`${artwork.title}, ${artwork.artist}`}
    >
      <img src={image.src} srcset={image.srcset} width={CELL.width} height={CELL.height} aspectFill />
      <title style={{ tvTextHighlightStyle: "marquee-on-highlight" }}>
        {favorite ? `♥ ${artwork.title}` : artwork.title}
      </title>
      <subtitle>{artwork.artist}</subtitle>
    </lockup>
  );
});

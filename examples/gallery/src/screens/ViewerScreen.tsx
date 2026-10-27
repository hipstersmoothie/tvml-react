import type { Artwork } from "../api";
import { useArtworkImage } from "../hooks";

/**
 * Full-screen swipe-through with `oneupTemplate`: one lockup per artwork,
 * swipe left/right to move between them.
 */
export function ViewerScreen({ items, startIndex = 0 }: { items: Array<Artwork>; startIndex?: number }) {
  return (
    <oneupTemplate theme="dark">
      <section>
        {items.map((artwork, index) => (
          <ViewerPage key={artwork.id} artwork={artwork} focused={index === startIndex} />
        ))}
      </section>
    </oneupTemplate>
  );
}

function ViewerPage({ artwork, focused }: { artwork: Artwork; focused: boolean }) {
  const image = useArtworkImage(artwork, 1920, 1080);
  return (
    <lockup autoHighlight={focused || undefined}>
      <img src={image.src} srcset={image.srcset} width={1920} height={1080} />
      <title>{artwork.title}</title>
      <subtitle>{[artwork.artist, artwork.date].filter(Boolean).join(" · ")}</subtitle>
    </lockup>
  );
}

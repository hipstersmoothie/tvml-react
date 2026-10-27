import { useNavigation } from "tvml-react";

import { imageUrl, type Artwork } from "../api";
import { useArtwork, useArtworkImage, useFavorites, useScreenScale } from "../hooks";
import { startSlideshow } from "../slideshow";
import { AmbientScreen } from "./AmbientScreen";
import { BrowseScreen } from "./BrowseScreen";
import { ViewerScreen } from "./ViewerScreen";

const HERO = { width: 680, height: 680 };

/** Artwork detail: large image, metadata, favorite toggle, viewers. */
export function ArtworkScreen({
  artwork,
  collection = [artwork],
}: {
  artwork: Artwork;
  /** The list this artwork was opened from, for swiping through. */
  collection?: Array<Artwork>;
}) {
  const navigation = useNavigation();
  const { artwork: detail, status, error } = useArtwork(artwork.id);
  const { isFavorite, toggle } = useFavorites();
  const hero = useArtworkImage(artwork, HERO.width, HERO.height);
  const scale = useScreenScale();
  const favorite = isFavorite(artwork.id);

  const index = Math.max(
    0,
    collection.findIndex((a) => a.id === artwork.id),
  );

  const facts: Array<[string, string | undefined]> = [
    ["Date", artwork.date],
    ["Medium", detail?.medium],
    ["Dimensions", detail?.dimensions],
    ["Origin", detail?.placeOfOrigin],
    ["Department", detail?.department ?? artwork.department],
  ];

  const description =
    detail?.description ??
    (status === "loading" ? "Loading…" : status === "error" ? error : detail?.creditLine);

  return (
    <productTemplate theme="dark">
      <banner>
        <infoList>
          {facts
            .filter((fact): fact is [string, string] => Boolean(fact[1]))
            .map(([label, value]) => (
              <info key={label}>
                <header>
                  <title>{label}</title>
                </header>
                <text>{value}</text>
              </info>
            ))}
        </infoList>
        <stack>
          <title>{artwork.title}</title>
          <row>
            <text>{detail?.artistDisplay.replace(/\n/g, " · ") ?? artwork.artist}</text>
          </row>
          {description ? (
            <description
              allowsZooming
              onSelect={() =>
                navigation.presentModal(
                  <descriptiveAlertTemplate theme="dark">
                    <title>{artwork.title}</title>
                    <description>{description}</description>
                  </descriptiveAlertTemplate>,
                )
              }
            >
              {description}
            </description>
          ) : null}
          <row>
            <buttonLockup
              onSelect={() => navigation.push(<ViewerScreen items={collection} startIndex={index} />)}
            >
              <badge src="resource://button-preview" />
              <title>View</title>
            </buttonLockup>
            <buttonLockup onSelect={() => toggle(artwork)}>
              <badge src={favorite ? "resource://button-rated" : "resource://button-rate"} />
              <title>{favorite ? "Favorited" : "Favorite"}</title>
            </buttonLockup>
            <buttonLockup
              onSelect={() =>
                navigation.push(<AmbientScreen items={collection} startIndex={index} />)
              }
            >
              <badge src="resource://button-play" />
              <title>Ambient</title>
            </buttonLockup>
            <buttonLockup
              onSelect={() =>
                startSlideshow(
                  rotate(collection, index).map((a) =>
                    imageUrl(a, 1920 * scale, 1080 * scale),
                  ),
                )
              }
            >
              <badge src="resource://button-shuffle" />
              <title>Slideshow</title>
            </buttonLockup>
            {detail?.artistId ? (
              <buttonLockup
                onSelect={() =>
                  navigation.push(
                    <BrowseScreen
                      title={`More by ${artwork.artist}`}
                      query={{ artistId: detail.artistId }}
                    />,
                  )
                }
              >
                <badge src="resource://button-more" />
                <title>Artist</title>
              </buttonLockup>
            ) : null}
          </row>
        </stack>
        <heroImg src={hero.src} srcset={hero.srcset} width={HERO.width} height={HERO.height} />
      </banner>
    </productTemplate>
  );
}

/** `items` starting at `start`, wrapping around. */
export function rotate<T>(items: Array<T>, start: number): Array<T> {
  return [...items.slice(start), ...items.slice(0, start)];
}

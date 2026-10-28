import { imageUrl, type Photo } from "./api";
import { useFavorites } from "./useFavorites";

export function PhotoDetail({ photo }: { photo: Photo }) {
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(photo);

  return (
    <productTemplate>
      <banner>
        <stack>
          <title>{photo.author}</title>
          <row>
            <text>{`${photo.width} × ${photo.height}`}</text>
          </row>
          <row>
            <buttonLockup onSelect={() => toggle(photo)}>
              <badge src={favorite ? "resource://button-checkmark" : "resource://button-add"} />
              <title>{favorite ? "Favorited" : "Favorite"}</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={imageUrl(photo, 800, 600)} />
      </banner>
    </productTemplate>
  );
}

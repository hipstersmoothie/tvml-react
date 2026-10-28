import { useNavigation } from "tvml-react";

import { imageUrl, type Photo } from "./api";
import { PhotoDetail } from "./PhotoDetail";

export function PhotoGrid({ photos }: { photos: Array<Photo> }) {
  const navigation = useNavigation();
  return (
    <stackTemplate>
      <collectionList>
        <grid>
          <section>
            {photos.map((photo) => (
              <lockup key={photo.id} onSelect={() => navigation.push(<PhotoDetail photo={photo} />)}>
                <img src={imageUrl(photo, 400, 300)} width={400} height={300} />
                <title>{photo.author}</title>
              </lockup>
            ))}
          </section>
        </grid>
      </collectionList>
    </stackTemplate>
  );
}

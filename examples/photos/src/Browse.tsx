import { useScreenQuery } from "tvml-react/query";

import { getPhotos } from "./api";
import { PhotoGrid } from "./PhotoGrid";

export function Browse() {
  const photos = useScreenQuery({ queryKey: ["photos"], queryFn: getPhotos });

  if (photos.isPending) {
    return (
      <loadingTemplate>
        <activityIndicator>
          <title>Loading photos</title>
        </activityIndicator>
      </loadingTemplate>
    );
  }

  if (photos.isError) {
    return (
      <alertTemplate>
        <title>Something went wrong</title>
        <description>{photos.error.message}</description>
        <button onSelect={() => photos.refetch()}>
          <text>Try Again</text>
        </button>
      </alertTemplate>
    );
  }

  return <PhotoGrid photos={photos.data} />;
}

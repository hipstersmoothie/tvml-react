// Photos from Lorem Picsum (https://picsum.photos), which needs no API key.

export interface Photo {
  id: string;
  author: string;
  width: number;
  height: number;
}

export async function getPhotos(): Promise<Array<Photo>> {
  const response = await fetch("https://picsum.photos/v2/list?limit=30");
  if (!response.ok) throw new Error(`Couldn't load photos (HTTP ${response.status})`);
  return response.json();
}

/** The photo, cropped to a size. */
export function imageUrl(photo: Photo, width: number, height: number): string {
  return `https://picsum.photos/id/${photo.id}/${width}/${height}`;
}

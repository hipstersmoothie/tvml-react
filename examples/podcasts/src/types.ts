export interface Podcast {
  /** iTunes collection id. */
  id: string;
  title: string;
  author: string;
  /** 600×600 artwork. */
  artwork: string;
  genre?: string;
  /** Missing for chart entries until looked up. */
  feedUrl?: string;
}

export interface Episode {
  /** RSS guid, or the enclosure URL when there is none. */
  id: string;
  title: string;
  description: string;
  /** Epoch ms, 0 if unknown. */
  published: number;
  /** Seconds, 0 if unknown. */
  duration: number;
  url: string;
  mediaType: "audio" | "video";
  artwork: string;
  season?: number;
  number?: number;
}

/** What's saved per episode the user has started. */
export interface Progress {
  /** Seconds. */
  position: number;
  /** Seconds, from the player once known. */
  duration: number;
  played: boolean;
  updatedAt: number;
  episode: Episode;
  podcast: Podcast;
}

// iTunes Search / Lookup, Apple's top-podcast charts, and RSS feeds.

import { requestJSON, requestText, type CancelToken } from "./http";
import { parseFeed, type Feed } from "./rss";
import type { Podcast } from "./types";
import { artworkAt, decodeEntities } from "./format";

interface ITunesPodcast {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  feedUrl?: string;
  primaryGenreName?: string;
}

function fromITunes(result: ITunesPodcast): Podcast {
  return {
    id: String(result.collectionId),
    title: result.collectionName,
    author: result.artistName,
    artwork: result.artworkUrl600 ?? artworkAt(result.artworkUrl100 ?? "", 600),
    genre: result.primaryGenreName,
    feedUrl: result.feedUrl,
  };
}

export async function searchPodcasts(term: string, token?: CancelToken): Promise<Array<Podcast>> {
  const params = new URLSearchParams({ media: "podcast", term, limit: "36" });
  const { results } = await requestJSON<{ results: Array<ITunesPodcast> }>(
    `https://itunes.apple.com/search?${params}`,
    token,
  );
  // Feeds without a feedUrl can't be played.
  return results.filter((r) => r.feedUrl).map(fromITunes);
}

export async function lookupPodcast(id: string, token?: CancelToken): Promise<Podcast> {
  const { results } = await requestJSON<{ results: Array<ITunesPodcast> }>(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`,
    token,
  );
  const [result] = results;
  if (!result) throw new Error("This podcast is no longer available.");
  return fromITunes(result);
}

interface ChartEntry {
  "im:name": { label: string };
  "im:artist": { label: string };
  "im:image": Array<{ label: string }>;
  id: { attributes: { "im:id": string } };
  category?: { attributes: { label: string } };
}

/** Apple Podcasts top shows, optionally for one genre id. */
export async function topPodcasts(genreId?: number, token?: CancelToken): Promise<Array<Podcast>> {
  const genre = genreId ? `/genre=${genreId}` : "";
  const { feed } = await requestJSON<{ feed: { entry?: Array<ChartEntry> } }>(
    `https://itunes.apple.com/us/rss/toppodcasts/limit=25${genre}/json`,
    token,
  );
  return (feed.entry ?? []).map((entry) => ({
    id: entry.id.attributes["im:id"],
    title: decodeEntities(entry["im:name"].label),
    author: decodeEntities(entry["im:artist"].label),
    artwork: artworkAt(entry["im:image"][entry["im:image"].length - 1]?.label ?? "", 600),
    genre: entry.category?.attributes.label,
  }));
}

/** The podcast's RSS feed. Chart entries are looked up first for their feed URL. */
export async function loadFeed(podcast: Podcast, token?: CancelToken): Promise<Feed> {
  const feedUrl = podcast.feedUrl ?? (await lookupPodcast(podcast.id, token)).feedUrl;
  if (!feedUrl) throw new Error("This podcast doesn't publish a feed.");
  return parseFeed(await requestText(feedUrl, token), podcast.artwork);
}

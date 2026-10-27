// Hacker News data. Story lists come from the official Firebase API (one
// request for the ids, then one per story). A story's whole comment tree
// comes from Algolia in a single request.

import { getJSON, mapLimit, type CancelSignal } from "./lib/http";
import { decodeHtml } from "./text";

const FIREBASE = "https://hacker-news.firebaseio.com/v0";
const ALGOLIA = "https://hn.algolia.com/api/v1";

export type FeedId = "top" | "new" | "best" | "ask" | "show";

export const FEEDS: ReadonlyArray<{ id: FeedId; label: string; title: string }> = [
  { id: "top", label: "Top", title: "Top Stories" },
  { id: "new", label: "New", title: "New Stories" },
  { id: "best", label: "Best", title: "Best Stories" },
  { id: "ask", label: "Ask", title: "Ask HN" },
  { id: "show", label: "Show", title: "Show HN" },
];

export const PAGE_SIZE = 30;

export interface Story {
  id: number;
  title: string;
  by: string;
  time: number;
  score: number;
  comments: number;
  url?: string;
  /** Self-post text (Ask HN etc.) as plain text. */
  text?: string;
  type: "story" | "job" | "poll";
}

interface RawItem {
  id: number;
  type?: string;
  by?: string;
  time?: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  deleted?: boolean;
  dead?: boolean;
}

export function fetchFeedIds(feed: FeedId, signal?: CancelSignal): Promise<Array<number>> {
  return getJSON<Array<number>>(`${FIREBASE}/${feed}stories.json`, { signal });
}

const itemCache = new Map<number, { story: Story | null; at: number }>();

async function fetchStory(id: number, maxAge: number, signal?: CancelSignal): Promise<Story | null> {
  const cached = itemCache.get(id);
  if (cached && Date.now() - cached.at < maxAge) return cached.story;
  const raw = await getJSON<RawItem | null>(`${FIREBASE}/item/${id}.json`, { signal });
  const story: Story | null =
    raw && !raw.deleted && !raw.dead && raw.title
      ? {
          id: raw.id,
          title: decodeHtml(raw.title),
          by: raw.by ?? "unknown",
          time: raw.time ?? 0,
          score: raw.score ?? 0,
          comments: raw.descendants ?? 0,
          url: raw.url,
          text: raw.text ? decodeHtml(raw.text) : undefined,
          type: raw.type === "job" || raw.type === "poll" ? raw.type : "story",
        }
      : null;
  itemCache.set(id, { story, at: Date.now() });
  return story;
}

/** Fetch stories for `ids`, 10 requests at a time, dropping deleted ones. */
export async function fetchStories(
  ids: ReadonlyArray<number>,
  { maxAge = 60_000, signal }: { maxAge?: number; signal?: CancelSignal } = {},
): Promise<Array<Story>> {
  const stories = await mapLimit(ids, 10, (id) => fetchStory(id, maxAge, signal));
  return stories.filter((s): s is Story => s !== null);
}

export interface Comment {
  id: number;
  author: string;
  time: number;
  text: string;
  depth: number;
  /** Number of replies below this one, at any depth. */
  replies: number;
}

export interface Thread {
  story: Story;
  comments: Array<Comment>;
}

interface AlgoliaItem {
  id: number;
  type: string;
  author: string | null;
  created_at_i: number;
  title: string | null;
  url: string | null;
  text: string | null;
  points: number | null;
  children: Array<AlgoliaItem>;
}

/** A story and its whole comment tree, flattened depth-first. */
export async function fetchThread(id: number, signal?: CancelSignal): Promise<Thread> {
  const root = await getJSON<AlgoliaItem>(`${ALGOLIA}/items/${id}`, { signal });
  const comments: Array<Comment> = [];

  const walk = (children: Array<AlgoliaItem>, depth: number): number => {
    let count = 0;
    for (const child of children) {
      // Deleted comments come back with no author and no text, but their
      // replies are still worth showing.
      if (child.text == null && child.author == null) {
        count += walk(child.children, depth);
        continue;
      }
      const comment: Comment = {
        id: child.id,
        author: child.author ?? "[deleted]",
        time: child.created_at_i,
        text: child.text ? decodeHtml(child.text) : "[deleted]",
        depth,
        replies: 0,
      };
      comments.push(comment);
      comment.replies = walk(child.children, depth + 1);
      count += 1 + comment.replies;
    }
    return count;
  };
  const total = walk(root.children, 0);

  return {
    story: {
      id: root.id,
      title: decodeHtml(root.title ?? ""),
      by: root.author ?? "unknown",
      time: root.created_at_i,
      score: root.points ?? 0,
      comments: total,
      url: root.url ?? undefined,
      text: root.text ? decodeHtml(root.text) : undefined,
      type: root.type === "job" || root.type === "poll" ? root.type : "story",
    },
    comments,
  };
}

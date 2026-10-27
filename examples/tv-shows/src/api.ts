// A small TVMaze client. TVJS has no `fetch`, so requests go through
// XMLHttpRequest. Responses are cached in memory for the session, so going back
// to a screen (or switching tabs) doesn't refetch.

const API = "https://api.tvmaze.com";

export interface Image {
  medium: string;
  original: string;
}

export interface Show {
  id: number;
  name: string;
  type: string;
  language: string | null;
  genres: Array<string>;
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string | null;
  ended: string | null;
  officialSite: string | null;
  rating: { average: number | null };
  weight: number;
  network: { name: string } | null;
  webChannel: { name: string } | null;
  image: Image | null;
  summary: string | null;
}

export interface Person {
  id: number;
  name: string;
  image: Image | null;
}

export interface CastCredit {
  person: Person;
  character: { id: number; name: string; image: Image | null };
}

export interface Season {
  id: number;
  number: number;
  name: string;
  episodeOrder: number | null;
  premiereDate: string | null;
  endDate: string | null;
  image: Image | null;
  summary: string | null;
}

export interface Episode {
  id: number;
  name: string;
  season: number;
  number: number | null;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string;
  runtime: number | null;
  rating: { average: number | null };
  image: Image | null;
  summary: string | null;
}

export interface ScheduledEpisode extends Episode {
  show: Show;
}

export interface ShowDetails extends Show {
  _embedded: { cast: Array<CastCredit>; seasons: Array<Season> };
}

export interface SearchResult {
  score: number;
  show: Show;
}

export const endpoints = {
  schedule: (country = "US") => `/schedule?country=${country}`,
  shows: (page: number) => `/shows?page=${page}`,
  search: (query: string) => `/search/shows?q=${encodeURIComponent(query)}`,
  show: (id: number) => `/shows/${id}?embed[]=cast&embed[]=seasons`,
  episodes: (seasonId: number) => `/seasons/${seasonId}/episodes`,
};

const cache = new Map<string, Promise<unknown>>();

export function getJSON<T>(path: string): Promise<T> {
  let request = cache.get(path) as Promise<T> | undefined;
  if (!request) {
    request = new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", API + path);
      xhr.timeout = 15000;
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as T);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`TVMaze returned ${xhr.status} for ${path}`));
        }
      };
      xhr.onerror = () => reject(new Error(`Couldn't reach TVMaze (${path})`));
      xhr.ontimeout = () => reject(new Error(`TVMaze timed out (${path})`));
      xhr.send();
    });
    cache.set(path, request);
    // Don't cache failures: a retry should hit the network again.
    request.catch(() => cache.delete(path));
  }
  return request;
}

// Formatting helpers ---------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

/** TVMaze summaries are HTML fragments; TVML text is plain. */
export function plainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (match, name: string) => ENTITIES[name] ?? match)
    .trim();
}

export function year(date: string | null | undefined): string {
  return date ? date.slice(0, 4) : "";
}

export function years(show: Partial<Pick<Show, "premiered" | "ended" | "status">>): string {
  const start = year(show.premiered);
  if (!start) return "";
  if (show.status === "Running") return `${start}–`;
  const end = year(show.ended);
  return end && end !== start ? `${start}–${end}` : start;
}

export function channel(show: Partial<Pick<Show, "network" | "webChannel">>): string {
  return show.network?.name ?? show.webChannel?.name ?? "";
}

export function poster(image: Image | null | undefined): string | undefined {
  return image?.medium ?? undefined;
}

export function episodeCode(episode: Episode): string {
  if (episode.number == null) return "Special";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `S${pad(episode.season)}E${pad(episode.number)}`;
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** "8:00 PM" in the viewer's time zone. */
export function airTime(episode: Episode): string {
  return episode.airstamp ? timeFormat.format(new Date(episode.airstamp)) : episode.airtime;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

/** "Jan 17, 2025" for a "2025-01-17" date. */
export function formatDay(date: string | null | undefined): string {
  return date ? dateFormat.format(new Date(`${date}T12:00:00`)) : "TBA";
}

export function airDate(episode: Episode): string {
  return formatDay(episode.airdate);
}

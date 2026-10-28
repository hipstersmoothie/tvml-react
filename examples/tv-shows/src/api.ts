// A small TVMaze client: TanStack Query options for each endpoint, plus the
// app's QueryClient. tvml-react polyfills `fetch` and `AbortController`; query
// functions pass TanStack's `signal` along, so a request no screen is waiting
// for any more is aborted.

import { QueryClient, queryOptions } from "@tanstack/react-query";

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

class HttpError extends Error {
  constructor(readonly status: number, path: string) {
    super(`TVMaze returned ${status} for ${path}`);
  }
}

async function getJSON<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(`Couldn't reach TVMaze (${path})`);
  }
  if (!response.ok) throw new HttpError(response.status, path);
  return (await response.json()) as T;
}

const MINUTE = 60_000;

/** One query per endpoint. Spread into useScreenQuery (adding `select`) or prefetch. */
export const tvmaze = {
  /** Today's schedule. Refreshed on app resume once it's 5 minutes old. */
  schedule: (country = "US") =>
    queryOptions({
      queryKey: ["schedule", country],
      queryFn: ({ signal }) => getJSON<Array<ScheduledEpisode>>(`/schedule?country=${country}`, signal),
      staleTime: 5 * MINUTE,
    }),
  /** A page of the /shows index (ordered by id, 250 per page). */
  shows: (page: number) =>
    queryOptions({
      queryKey: ["shows", page],
      queryFn: ({ signal }) => getJSON<Array<Show>>(`/shows?page=${page}`, signal),
    }),
  search: (query: string) =>
    queryOptions({
      queryKey: ["search", query],
      queryFn: ({ signal }) =>
        getJSON<Array<SearchResult>>(`/search/shows?q=${encodeURIComponent(query)}`, signal),
    }),
  show: (id: number) =>
    queryOptions({
      queryKey: ["show", id],
      queryFn: ({ signal }) => getJSON<ShowDetails>(`/shows/${id}?embed[]=cast&embed[]=seasons`, signal),
    }),
  episodes: (seasonId: number) =>
    queryOptions({
      queryKey: ["episodes", seasonId],
      queryFn: ({ signal }) => getJSON<Array<Episode>>(`/seasons/${seasonId}/episodes`, signal),
    }),
};

/**
 * Catalog data changes rarely, so it's fresh for an hour. Not-found errors
 * aren't retried; anything else is retried once.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * MINUTE,
      retry: (failures, error) =>
        failures < 1 && !(error instanceof HttpError && error.status >= 400 && error.status < 500),
    },
  },
});

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

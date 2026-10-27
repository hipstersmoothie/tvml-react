// Art Institute of Chicago public API (no key). TVJS has no fetch or
// AbortController, so requests go through XMLHttpRequest and are cancelled
// with xhr.abort().

const API = "https://api.artic.edu/api/v1";
const IIIF = "https://www.artic.edu/iiif/2";

const LIST_FIELDS = [
  "id",
  "title",
  "artist_title",
  "artist_display",
  "date_display",
  "image_id",
  "department_title",
  "thumbnail.width",
  "thumbnail.height",
  "thumbnail.alt_text",
].join(",");

const DETAIL_FIELDS = [
  LIST_FIELDS,
  "medium_display",
  "dimensions",
  "credit_line",
  "place_of_origin",
  "artwork_type_title",
  "style_title",
  "artist_id",
  "department_id",
  "description",
].join(",");

/** What a grid cell, a favorite or a slideshow frame needs. */
export interface Artwork {
  id: number;
  title: string;
  artist: string;
  date: string;
  imageId: string;
  /** Pixel size of the original scan, used for the aspect ratio. */
  width: number;
  height: number;
  alt?: string;
  department?: string;
}

export interface ArtworkDetail extends Artwork {
  artistDisplay: string;
  medium?: string;
  dimensions?: string;
  creditLine?: string;
  placeOfOrigin?: string;
  type?: string;
  style?: string;
  artistId?: number;
  departmentId?: string;
  /** Plain text; the API returns HTML. */
  description?: string;
}

export interface Page {
  items: Array<Artwork>;
  total: number;
  totalPages: number;
}

export interface Department {
  id: string;
  title: string;
}

/** Departments with a meaningful number of public-domain images. */
export const DEPARTMENTS: Array<Department> = [
  { id: "PC-10", title: "Painting and Sculpture of Europe" },
  { id: "PC-3", title: "Arts of the Americas" },
  { id: "PC-7", title: "Arts of Asia" },
  { id: "PC-13", title: "Prints and Drawings" },
  { id: "PC-12", title: "Photography and Media" },
  { id: "PC-11", title: "Modern Art" },
  { id: "PC-1", title: "Arts of Africa" },
  { id: "PC-4", title: "Arts of Greece, Rome, and Byzantium" },
  { id: "PC-14", title: "Textiles" },
];

// ---------------------------------------------------------------------------
// Transport

export interface Request<T> extends Promise<T> {
  abort(): void;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(status === 0 ? `Couldn't reach ${new URL(url).hostname}` : `HTTP ${status} for ${url}`);
  }
}

export function getJSON<T>(url: string, timeoutMs = 15000): Request<T> {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open("GET", url);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new HttpError(xhr.status, url));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new HttpError(0, url));
    xhr.ontimeout = () => reject(new Error("The request timed out"));
    xhr.send();
  });
  return Object.assign(promise, { abort: () => xhr.abort() });
}

function mapRequest<A, B>(request: Request<A>, fn: (value: A) => B): Request<B> {
  return Object.assign(request.then(fn), { abort: request.abort });
}

// ---------------------------------------------------------------------------
// Queries

interface RawArtwork {
  id: number;
  title: string;
  artist_title?: string | null;
  artist_display?: string | null;
  date_display?: string | null;
  image_id?: string | null;
  department_title?: string | null;
  thumbnail?: { width?: number; height?: number; alt_text?: string | null } | null;
  medium_display?: string | null;
  dimensions?: string | null;
  credit_line?: string | null;
  place_of_origin?: string | null;
  artwork_type_title?: string | null;
  style_title?: string | null;
  artist_id?: number | null;
  department_id?: string | null;
  description?: string | null;
}

interface RawList {
  data: Array<RawArtwork>;
  pagination: { total: number; total_pages: number };
}

function toArtwork(raw: RawArtwork): Artwork | null {
  if (!raw.image_id) return null;
  return {
    id: raw.id,
    title: raw.title || "Untitled",
    artist: raw.artist_title || firstLine(raw.artist_display) || "Unknown artist",
    date: raw.date_display ?? "",
    imageId: raw.image_id,
    width: raw.thumbnail?.width ?? 1,
    height: raw.thumbnail?.height ?? 1,
    alt: raw.thumbnail?.alt_text ?? undefined,
    department: raw.department_title ?? undefined,
  };
}

const firstLine = (value?: string | null) => value?.split("\n")[0];
const orUndefined = (value?: string | null) => value || undefined;

function stripHtml(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "’")
    .trim();
}

/** Filters for /artworks/search, in the API's bracketed query-string syntax. */
export interface ArtworkQuery {
  /** Free-text search. */
  q?: string;
  departmentId?: string;
  artistId?: number;
}

const PAGE_SIZE = 36;

function searchUrl(query: ArtworkQuery, page: number, limit: number): string {
  const filters: Array<string> = [
    "[exists][field]=image_id",
    "[term][is_public_domain]=true",
  ];
  if (query.departmentId) filters.push(`[term][department_id]=${query.departmentId}`);
  if (query.artistId) filters.push(`[term][artist_id]=${query.artistId}`);

  const params = filters.map((f, i) => `query[bool][filter][${i}]${f}`);
  if (query.q) params.push(`q=${encodeURIComponent(query.q)}`);
  params.push(`fields=${LIST_FIELDS}`, `limit=${limit}`, `page=${page}`);
  return `${API}/artworks/search?${params.join("&")}`;
}

/** One page of artworks with images, most popular first. Pages start at 1. */
export function searchArtworks(
  query: ArtworkQuery,
  page = 1,
  limit = PAGE_SIZE,
): Request<Page> {
  return mapRequest(getJSON<RawList>(searchUrl(query, page, limit)), (raw) => ({
    items: raw.data.map(toArtwork).filter((a): a is Artwork => a !== null),
    total: raw.pagination.total,
    totalPages: raw.pagination.total_pages,
  }));
}

export function getArtwork(id: number): Request<ArtworkDetail> {
  return mapRequest(
    getJSON<{ data: RawArtwork }>(`${API}/artworks/${id}?fields=${DETAIL_FIELDS}`),
    ({ data }) => {
      const base = toArtwork(data);
      if (!base) throw new Error("This artwork has no image");
      return {
        ...base,
        artistDisplay: data.artist_display ?? base.artist,
        medium: orUndefined(data.medium_display),
        dimensions: orUndefined(firstLine(data.dimensions)),
        creditLine: orUndefined(data.credit_line),
        placeOfOrigin: orUndefined(data.place_of_origin),
        type: orUndefined(data.artwork_type_title),
        style: orUndefined(data.style_title),
        artistId: data.artist_id ?? undefined,
        departmentId: data.department_id ?? undefined,
        description: data.description ? stripHtml(data.description) : undefined,
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Images

export type Fit = "contain" | "cover";

/**
 * IIIF URL for an artwork scaled to fit (or cover) `width`×`height` pixels. The
 * museum's IIIF server scales on the fly, so we ask for what the screen needs
 * instead of decoding a 10,000-pixel scan.
 *
 * Sizes are given as a percentage (`pct:4.36`) rather than the usual `!w,h`:
 * TVMLKit splits `srcset` on every comma, so a URL containing one breaks the
 * whole attribute (and `src` is not used as a fallback).
 */
export function imageUrl(
  artwork: Pick<Artwork, "imageId" | "width" | "height">,
  width: number,
  height: number,
  fit: Fit = "contain",
): string {
  const { imageId } = artwork;
  if (artwork.width <= 1 || artwork.height <= 1) {
    // Unknown original size; fine for `src`, not for `srcset`.
    return `${IIIF}/${imageId}/full/!${Math.round(width)},${Math.round(height)}/0/default.jpg`;
  }
  const sx = width / artwork.width;
  const sy = height / artwork.height;
  const scale = fit === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
  // Round up so the image is never smaller than the box; the server refuses
  // anything at or above full size for most scans.
  const pct = Math.min(Math.ceil(scale * 10000) / 100, 99);
  return `${IIIF}/${imageId}/full/pct:${pct}/0/default.jpg`;
}

/** The public web page for an artwork. */
export const webUrl = (id: number) => `https://www.artic.edu/artworks/${id}`;

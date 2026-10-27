// TVML text elements only take plain text, so HN's HTML (comments and
// self-posts) is converted here: paragraphs become blank lines, links become
// their full URL, code blocks keep their line breaks, and entities are decoded.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** HN's comment HTML → plain text with paragraph breaks. */
export function decodeHtml(html: string): string {
  const text = html
    // <a href="full">truncated...</a> → full URL
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi, (_m, href: string) => decodeEntities(href))
    .replace(/<\/?(pre|code)>/gi, "")
    .replace(/<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?i>/gi, "")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** First `max` characters of `text` on one line, cut at a word boundary. */
export function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max * 0.6 ? space : max).trimEnd()}…`;
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

const relativeFormat =
  typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl
    ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "long" })
    : undefined;

/** "3 hours ago", from a Unix timestamp in seconds. */
export function timeAgo(seconds: number, now = Date.now()): string {
  const delta = seconds - now / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(delta) >= size) {
      const value = Math.round(delta / size);
      return relativeFormat ? relativeFormat.format(value, unit) : `${Math.abs(value)} ${unit}s ago`;
    }
  }
  return relativeFormat ? relativeFormat.format(0, "minute") : "just now";
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

/** "github.com" from a story URL. */
export function domain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = /^https?:\/\/(?:www\.)?([^/:?#]+)/i.exec(url);
  return match?.[1];
}

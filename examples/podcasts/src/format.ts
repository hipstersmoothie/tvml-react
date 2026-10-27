// Text, duration and date formatting. TVJS has full Intl (DateTimeFormat,
// RelativeTimeFormat) as well as its own formatDate/formatDuration globals.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Show notes are HTML; TVML text elements want plain text. */
export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(br|\/p|\/li|\/div)\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n"),
  ).trim();
}

/** itunes:duration is "HH:MM:SS", "MM:SS" or plain seconds. */
export function parseDuration(value: string): number {
  if (!value) return 0;
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return Math.round(parts.reduce((total, part) => total * 60 + part, 0));
}

/** "1 hr 5 min", "42 min", "30 sec". */
export function formatLength(seconds: number): string {
  if (!seconds || seconds < 0) return "";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export function formatRemaining(position: number, duration: number): string {
  const left = duration - position;
  return left > 0 ? `${formatLength(left)} left` : "";
}

const DAY = 24 * 60 * 60 * 1000;
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" });

/** "Today", "Yesterday", "Tuesday", "Oct 3", "Oct 3, 2023". */
export function formatPublished(epochMs: number, now = Date.now()): string {
  if (!epochMs) return "";
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const daysAgo = Math.ceil((startOfToday - epochMs) / DAY);
  if (daysAgo <= 1) return capitalize(relative.format(-Math.max(daysAgo, 0), "day"));
  if (daysAgo < 7) return weekday.format(epochMs);
  const sameYear = new Date(epochMs).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? shortDate : longDate).format(epochMs);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Upgrade a mzstatic artwork URL ("…/100x100bb.jpg") to the size we want. */
export function artworkAt(url: string, size: number): string {
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${size}x${size}bb.$1`);
}

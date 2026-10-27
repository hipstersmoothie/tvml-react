const compact = new Intl.NumberFormat("en", { notation: "compact" });

export function viewers(count: number | undefined): string {
  if (!count) return "No viewers yet";
  return `${compact.format(count)} watching`;
}

export function ago(iso: string | undefined, now: number): string {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function uptime(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `Live for ${h} hr ${m} min` : `Live for ${m} min`;
}

export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

/** Titles sometimes contain newlines and runs of whitespace. */
export const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

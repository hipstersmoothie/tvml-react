import { getCollection, type CollectionEntry } from "astro:content";

export type Section = "learn" | "reference";
export type DocEntry = CollectionEntry<"docs">;

export interface NavGroup {
  title: string;
  entries: Array<DocEntry>;
}

// Reference groups, in sidebar order.
const REFERENCE_GROUPS = ["Essentials", "Navigation", "Layout", "Media", "Data"];

/** The page's URL path segment within its section, e.g. "getting-started". */
export function slugOf(entry: DocEntry): string {
  return entry.id.replace(/^(learn|reference)\//, "");
}

export function hrefOf(entry: DocEntry): string {
  return `/${entry.data.section}/${slugOf(entry)}/`;
}

export async function entries(section: Section): Promise<Array<DocEntry>> {
  const all = await getCollection("docs", (entry) => entry.data.section === section);
  return all.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export async function navFor(section: Section): Promise<Array<NavGroup>> {
  const list = await entries(section);
  if (section === "learn") return [{ title: "Learn", entries: list }];
  const groups = new Map<string, Array<DocEntry>>();
  for (const entry of list) {
    const group = entry.data.group ?? "Other";
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  const order = (title: string) => {
    const index = REFERENCE_GROUPS.indexOf(title);
    return index === -1 ? REFERENCE_GROUPS.length : index;
  };
  return [...groups]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([title, list]) => ({ title, entries: list }));
}

// Generates the Learn guides (src/content/docs/learn/*.md) from the repo's
// README.md and docs/platform-notes.md, so the README stays the one place the
// prose is edited. Run with `pnpm sync` after changing either file.
//
// Each guide is a list of README sections, by heading. A section runs to the
// next heading of the same or a higher level; its headings move up a level so
// the guide's own sections are h2s.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("../../", import.meta.url).pathname;
const out = new URL("../src/content/docs/learn/", import.meta.url).pathname;
const GITHUB = "https://github.com/hipstersmoothie/tvml-react/blob/main/";

const guides = [
  {
    slug: "getting-started",
    title: "Getting started",
    abstract: "Create an Apple TV app with React, or add tvml-react to an existing one.",
    order: 1,
    sections: ["## Getting started"],
  },
  {
    slug: "screens-and-navigation",
    title: "Screens and navigation",
    abstract: "Render into TVML documents, push screens and modals, and build tab bars.",
    order: 2,
    sections: [
      "### `launch(element, options?)`",
      "### `createRoot(document?, options?)`",
      "### Navigation",
      "### Tabs",
      "### `DocumentPortal`",
    ],
  },
  {
    slug: "events-and-attributes",
    title: "Events and attributes",
    abstract: "Handle the remote, write attributes and styles, and work with text fields and focus.",
    order: 3,
    sections: ["### Events", "### Attributes and styles", "### Text fields and focus"],
  },
  {
    slug: "layout",
    title: "Laying out a divTemplate",
    abstract: "Rows, cells, stacks and boxes for free-form screens, inside the TV-safe area.",
    order: 4,
    sections: ["### Free-form layout"],
  },
  {
    slug: "platform-hooks",
    title: "Platform hooks",
    abstract: "App state, device and settings, storage, appearance, accessibility and more.",
    order: 5,
    sections: ["## Hooks"],
  },
  {
    slug: "media",
    title: "Media playback",
    abstract: "Play video and audio in TVMLKit's player, share it across screens, and draw over it.",
    order: 6,
    sections: ["## Media playback"],
  },
  {
    slug: "data",
    title: "Data and networking",
    abstract: "TanStack Query that pauses on hidden screens, fetch, and WebSockets.",
    order: 7,
    sections: ["## Data fetching", "## WebSockets"],
  },
  {
    slug: "native",
    title: "Native elements and the Swift package",
    abstract: "Launch from Swift, register your own native elements, and use the ones that ship.",
    order: 8,
    sections: ["## Swift package", "### Custom elements"],
  },
  {
    slug: "testing",
    title: "Testing",
    abstract: "Drive a running app from JavaScript with tvml-react/testing.",
    order: 9,
    sections: ["## Testing on the device"],
  },
  {
    slug: "build-tooling",
    title: "Build tooling",
    abstract: "Bundle for TVJS with esbuild directly, without the CLI.",
    order: 10,
    sections: ["## Build tooling without the CLI"],
  },
];

const readme = readFileSync(join(repo, "README.md"), "utf8").split("\n");

function level(line) {
  const match = /^(#{1,6}) /.exec(line);
  return match ? match[1].length : 0;
}

/** Lines of a section, from its heading to the next of the same or higher level. */
function section(lines, heading) {
  const start = lines.indexOf(heading);
  if (start === -1) throw new Error(`README has no heading "${heading}"`);
  const depth = level(heading);
  let end = start + 1;
  let fenced = false;
  for (; end < lines.length; end++) {
    if (lines[end].startsWith("```")) fenced = !fenced;
    const l = fenced ? 0 : level(lines[end]);
    if (l && l <= depth) break;
  }
  return { depth, lines: lines.slice(start, end) };
}

/** Moves headings so the section's own heading becomes an h2 (or is dropped). */
function shift(lines, depth, keepHeading) {
  // Kept: the heading becomes an h2. Dropped: its subsections do.
  const by = keepHeading ? depth - 2 : depth - 1;
  const body = keepHeading ? lines : lines.slice(1);
  let fenced = false;
  return body.map((line) => {
    if (line.startsWith("```")) fenced = !fenced;
    if (fenced || !level(line)) return line;
    return "#".repeat(Math.max(2, level(line) - by)) + line.slice(level(line));
  });
}

function links(text) {
  return text
    .replace(/\]\(docs\/platform-notes\.md(#[^)]*)?\)/g, (_, hash = "") => `](/learn/platform-notes${hash})`)
    .replace(/\]\((?!https?:|#|\/)([^)]+)\)/g, (_, path) => `](${GITHUB}${path})`);
}

function frontmatter(guide) {
  return [
    "---",
    `title: ${JSON.stringify(guide.title)}`,
    "section: learn",
    `abstract: ${JSON.stringify(guide.abstract)}`,
    `order: ${guide.order}`,
    "---",
    "",
    "<!-- Generated from README.md by scripts/sync-guides.mjs; edit the README. -->",
    "",
  ].join("\n");
}

mkdirSync(out, { recursive: true });

for (const guide of guides) {
  const parts = guide.sections.map((heading, index) => {
    const { depth, lines } = section(readme, heading);
    // A single-section guide's heading is the page title; multi-section guides
    // keep each section's heading.
    return shift(lines, depth, guide.sections.length > 1 || index > 0).join("\n").trim();
  });
  writeFileSync(join(out, `${guide.slug}.md`), frontmatter(guide) + links(parts.join("\n\n")) + "\n");
}

// Platform notes: its own document, minus its title.
const notes = readFileSync(join(repo, "docs/platform-notes.md"), "utf8").split("\n");
const body = notes.slice(notes.findIndex((line) => line.startsWith("# ")) + 1).join("\n").trim();
writeFileSync(
  join(out, "platform-notes.md"),
  frontmatter({
    title: "Platform notes",
    abstract: "What TVMLKit actually does on tvOS 26: runtime, templates, layout, media and performance.",
    order: 11,
  }).replace("edit the README", "edit docs/platform-notes.md") + links(body) + "\n",
);

console.log(`Wrote ${guides.length + 1} guides to ${out}`);

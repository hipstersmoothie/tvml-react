// Copies docs/platform-notes.md into the Learn appendix, so the repo's notes
// stay the one place they're edited. Runs before every dev and build.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = new URL("../../docs/platform-notes.md", import.meta.url);
const out = new URL("../src/content/docs/learn/platform-notes.md", import.meta.url);
const GITHUB = "https://github.com/hipstersmoothie/tvml-react/blob/main/";

const lines = readFileSync(source, "utf8").split("\n");
const body = lines
  .slice(lines.findIndex((line) => line.startsWith("# ")) + 1)
  .join("\n")
  .trim()
  // Repo-relative links point at GitHub.
  .replace(/\]\((?!https?:|#|\/)\.\.\/([^)]+)\)/g, (_, path) => `](${GITHUB}${path})`)
  .replace(/\]\((?!https?:|#|\/)([^)]+)\)/g, (_, path) => `](${GITHUB}docs/${path})`);

const frontmatter = `---
title: "Platform notes"
section: learn
group: Appendix
order: 100
abstract: "How TVMLKit really behaves on tvOS 26: what works, what's ignored, and what to do instead."
---

<!-- Generated from docs/platform-notes.md by scripts/sync-notes.mjs; edit that file. -->

`;

mkdirSync(new URL(".", out), { recursive: true });
writeFileSync(out, frontmatter + body + "\n");

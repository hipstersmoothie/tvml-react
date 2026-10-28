// Fails when a public export of tvml-react has no Reference page, or a page
// lists a symbol that doesn't exist. Every page's `symbols` frontmatter says
// what it documents.

import { readdirSync, readFileSync } from "node:fs";

import { loadApi } from "../src/lib/api-extract.mjs";

const dir = new URL("../src/content/docs/reference/", import.meta.url);
const covered = new Map();
for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
  const text = readFileSync(new URL(file, dir), "utf8");
  const match = /^symbols:\s*\[([^\]]*)\]/m.exec(text);
  if (!match) continue;
  for (const name of match[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)) {
    covered.set(name, file);
  }
}

const api = loadApi();
const missing = [...api.keys()].filter((name) => !covered.has(name));
const unknown = [...covered.keys()].filter((name) => !api.has(name));

for (const name of unknown) console.error(`${covered.get(name)}: no export named ${name}`);
if (missing.length) {
  console.error(`Not in any Reference page (${missing.length}):`);
  for (const name of missing) console.error(`  ${api.get(name).module}: ${name}`);
}
if (missing.length || unknown.length) process.exit(1);
console.log(`Reference covers all ${api.size} exports.`);

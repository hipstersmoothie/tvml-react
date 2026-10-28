#!/usr/bin/env node
// Publishes tvml-react and create-tvml-react from this machine.
//
//   pnpm release            # checks, publishes both packages, tags, GitHub release
//   pnpm release --dry-run  # everything except publishing, tagging and pushing
//
// Bump "version" in package.json and create/package.json and add a
// "## <version>" section to CHANGELOG.md first. npm will ask you to log in
// (`npm login`) and for a one-time password if your account uses 2FA.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dryRun = process.argv.includes("--dry-run");
const root = new URL("..", import.meta.url).pathname;

function run(command, args, options = {}) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  execFileSync(command, args, { cwd: root, stdio: "inherit", ...options });
}

function output(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`\nrelease: ${message}`);
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const createVersion = JSON.parse(readFileSync(join(root, "create/package.json"), "utf8")).version;
const tag = `v${version}`;
const prerelease = version.includes("-");

// --- Checks ---------------------------------------------------------------------

if (createVersion !== version) {
  fail(`create/package.json is ${createVersion} but package.json is ${version}; release them together.`);
}
if (output("git", ["status", "--porcelain"])) fail("the working tree has uncommitted changes.");
if (output("git", ["branch", "--show-current"]) !== "main") fail("release from main.");
run("git", ["fetch", "--quiet", "origin", "main", "--tags"]);
if (output("git", ["rev-parse", "HEAD"]) !== output("git", ["rev-parse", "origin/main"])) {
  fail("main isn't the same as origin/main; push or pull first.");
}
if (output("git", ["tag", "--list", tag])) fail(`${tag} is already tagged.`);

const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
const section = changelog.split(/^## /m).find((part) => part.startsWith(`${version}\n`));
if (!section) fail(`CHANGELOG.md has no "## ${version}" section.`);
const notes = section.slice(version.length).trim();

run("pnpm", ["typecheck"]);
run("pnpm", ["test"]);
run("pnpm", ["build"]);

// The starter scaffolds and has nothing left to substitute.
const scratch = mkdtempSync(join(tmpdir(), "create-tvml-react-"));
try {
  run("node", [join(root, "create/index.js"), "smoke-app"], { cwd: scratch });
  const app = join(scratch, "smoke-app");
  for (const file of ["package.json", "src/main.tsx", "tvos/SmokeApp.xcodeproj/project.pbxproj"]) {
    if (!existsSync(join(app, file))) fail(`the starter didn't create ${file}.`);
  }
  const pkg = readFileSync(join(app, "package.json"), "utf8");
  if (!pkg.includes(`"tvml-react": "^${version}"`)) fail("the starter doesn't depend on this version.");
  let leftover = "";
  try {
    leftover = output("grep", ["-rlE", "__[A-Z]+__", app]);
  } catch (error) {
    // grep exits 1 when nothing matches, which is what we want.
    if (error.status !== 1) throw error;
  }
  if (leftover) fail(`placeholders left in ${leftover.split("\n").join(", ")}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// --- Publish --------------------------------------------------------------------

const publish = ["publish", "--access", "public"];
if (prerelease) publish.push("--tag", "next");
if (dryRun) publish.push("--dry-run");

run("npm", publish);
run("npm", publish, { cwd: join(root, "create") });

if (dryRun) {
  console.log(`\nDry run done: ${tag} would be published, tagged and released.`);
  process.exit(0);
}

run("git", ["tag", "-a", tag, "-m", tag]);
run("git", ["push", "origin", tag]);
run("gh", [
  "release",
  "create",
  tag,
  "--title",
  tag,
  "--notes",
  notes,
  ...(prerelease ? ["--prerelease"] : []),
]);

console.log(`\nReleased ${tag}: https://www.npmjs.com/package/tvml-react`);

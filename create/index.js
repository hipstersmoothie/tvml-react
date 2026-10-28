#!/usr/bin/env node
// npm create tvml-react [directory] [--bundle-id com.example.app]
//
// Copies ./template: the React app at the root and a tvOS Xcode project in
// tvos/. "TVMLApp" in file names and contents becomes the app's name.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "template");
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

const USAGE = `Usage: npm create tvml-react [directory] [--bundle-id <id>]

Creates an Apple TV app with tvml-react: a React app and a tvOS Xcode project.

  --bundle-id <id>   The app's bundle identifier (default: com.example.<name>)
  -h, --help         Show this help`;

function parseArgs(argv) {
  const args = { directory: undefined, bundleId: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (arg === "--bundle-id") {
      args.bundleId = argv[++i];
    } else if (arg.startsWith("--bundle-id=")) {
      args.bundleId = arg.slice("--bundle-id=".length);
    } else if (arg.startsWith("-")) {
      fail(`Unknown option ${arg}\n\n${USAGE}`);
    } else {
      args.directory = arg;
    }
  }
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** "my tv-app" → "my-tv-app" */
function packageName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-~._]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
}

/** "my-tv-app" → "MyTvApp", usable as an Xcode target and Swift module name. */
function appName(name) {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const pascal = words.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return /^[0-9]/.test(pascal) ? `App${pascal}` : pascal || "TVApp";
}

function packageManager() {
  const agent = process.env.npm_config_user_agent ?? "";
  for (const pm of ["pnpm", "yarn", "bun"]) {
    if (agent.startsWith(pm)) return pm;
  }
  return "npm";
}

function copy(from, to, replace) {
  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    const target = join(to, replace(entry === "_gitignore" ? ".gitignore" : entry));
    if (statSync(source).isDirectory()) {
      mkdirSync(target, { recursive: true });
      copy(source, target, replace);
    } else {
      writeFileSync(target, replace(readFileSync(source, "utf8")));
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let directory = args.directory;
  if (!directory) {
    if (!process.stdin.isTTY) fail(USAGE);
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    directory = (await prompt.question("Project name: (my-tv-app) ")).trim() || "my-tv-app";
    prompt.close();
  }

  const root = resolve(directory);
  if (existsSync(root) && readdirSync(root).length > 0) {
    fail(`${directory} already exists and isn't empty.`);
  }

  const name = packageName(basename(root));
  if (!name) fail(`Can't make a package name from "${basename(root)}".`);
  const app = appName(basename(root));
  const bundleId = args.bundleId ?? `com.example.${app.toLowerCase()}`;
  if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(bundleId)) {
    fail(`"${bundleId}" isn't a valid bundle identifier (like com.example.app).`);
  }
  const pm = packageManager();

  const replace = (text) =>
    text
      .replaceAll("com.example.tvmlapp", bundleId)
      .replaceAll("TVMLApp", app)
      .replaceAll("__NAME__", name)
      .replaceAll("__APP__", app)
      .replaceAll("__VERSION__", version)
      .replaceAll("__PM__", pm);

  mkdirSync(root, { recursive: true });
  copy(TEMPLATE, root, replace);

  const run = pm === "npm" ? "npm run" : pm;
  console.log(`
Created ${app} in ${root}

  cd ${directory}
  ${pm} install
  ${run} dev
  open tvos/${app}.xcodeproj    # then run the ${app} scheme on an Apple TV simulator
`);
}

main().catch((error) => fail(error.stack ?? String(error)));

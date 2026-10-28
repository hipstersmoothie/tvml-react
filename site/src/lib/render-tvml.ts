// Runs an example through tvml-react at build time, against the same
// in-memory TVJS DOM the unit tests use, and returns the TVML it renders.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { transform } from "esbuild";
import { createElement, type ComponentType, type ReactNode } from "react";
import { createRoot } from "tvml-react";

import { FakeDocument } from "../../../test/fake-dom";

export function renderToTVML(element: ReactNode, create: typeof createRoot = createRoot): string {
  const doc = new FakeDocument();
  const root = create(doc as never);
  root.render(element);
  const xml = doc.toXML();
  root.unmount();
  return formatXML(xml);
}

// Indent one element per line; text stays on its element's line.
function formatXML(xml: string): string {
  const tokens = xml.match(/<[^>]+>|[^<]+/g) ?? [];
  const lines: Array<string> = [];
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("</")) {
      depth--;
      lines.push("  ".repeat(depth) + token);
    } else if (token.startsWith("<") && token.endsWith("/>")) {
      lines.push("  ".repeat(depth) + token);
    } else if (token.startsWith("<")) {
      const text = tokens[i + 1];
      const close = tokens[i + 2];
      if (text && !text.startsWith("<") && close?.startsWith("</")) {
        lines.push("  ".repeat(depth) + token + text + close);
        i += 2;
      } else {
        lines.push("  ".repeat(depth) + token);
        depth++;
      }
    }
  }
  return lines.join("\n");
}

// Compiled examples go inside the site's node_modules so their imports
// (tvml-react, react) resolve.
const CACHE = join(process.cwd(), "node_modules", ".tvml-examples");

/**
 * Compiles an example's source with tvml-react's JSX runtime, runs its default
 * export with `props`, and returns the TVML it renders. The page shows the
 * same source, so the output always matches the code.
 */
export async function runExample(source: string, props: Record<string, unknown> = {}): Promise<string> {
  const { code } = await transform(source, {
    loader: "tsx",
    jsx: "automatic",
    jsxImportSource: "tvml-react",
    format: "esm",
  });
  // Render through the example's own copy of tvml-react: the site bundle has
  // another, and hooks like useNavigation need the root from the same one.
  const runnable = `${code}\nexport { createRoot as __createRoot } from "tvml-react";\n`;
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, createHash("sha1").update(runnable).digest("hex") + ".mjs");
  writeFileSync(file, runnable);
  const module = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as {
    default: ComponentType<Record<string, unknown>>;
    __createRoot: typeof createRoot;
  };
  return renderToTVML(createElement(module.default, props), module.__createRoot);
}

/** Source as shown in the docs: without the JSX pragmas the build needs. */
export function displaySource(source: string): string {
  return source.replace(/^\/\*\* @jsx\w+ [^*]*\*\/\n/gm, "").trim();
}

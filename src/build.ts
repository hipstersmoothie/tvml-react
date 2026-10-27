// esbuild preset for TVMLKit bundles. TVMLKit evaluates JavaScript in a bare
// JavaScriptCore context, so the app has to be a single classic script that
// publishes a `start()` function for the bootstrap `Application.js` to call.

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { BuildOptions } from "esbuild";

/** Global the bundle is published under; the bootstrap looks for it. */
export const GLOBAL_NAME = "TVMLReactApp";

export const polyfillsPath = fileURLToPath(
  new URL("./polyfills.js", import.meta.url),
);

export const bootstrapPath = fileURLToPath(
  new URL("../bootstrap/Application.js", import.meta.url),
);

export interface TVMLBuildOptions {
  /** Entry module. It must export `start(options: StartOptions)`. */
  entry: string;
  /** Output directory. Receives `app.js` (and `Application.js`). */
  outdir: string;
  /** Unminified with inline source maps. Defaults to false. */
  dev?: boolean;
  /** Merged over the preset. */
  esbuild?: BuildOptions;
}

export function tvmlBuildOptions({
  entry,
  outdir,
  dev = false,
  esbuild = {},
}: TVMLBuildOptions): BuildOptions {
  return {
    entryPoints: [entry],
    outfile: path.join(outdir, "app.js"),
    bundle: true,
    format: "iife",
    globalName: GLOBAL_NAME,
    // tvOS 15+ JavaScriptCore. Keep this conservative: a syntax error here is a
    // blank screen on the TV with no console.
    target: ["safari15"],
    jsx: "automatic",
    jsxImportSource: "tvml-react",
    // Injected modules are evaluated before everything else, so the polyfills
    // are in place before React's scheduler inspects the environment.
    inject: [polyfillsPath],
    define: {
      "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
    },
    minify: !dev,
    sourcemap: dev ? "inline" : false,
    legalComments: "none",
    logLevel: "info",
    // The bootstrap evals the bundle inside a function, where the IIFE's
    // top-level `var` stays local. Publish it on globalThis explicitly.
    footer: {
      js: `if(typeof ${GLOBAL_NAME}!=='undefined'){globalThis.${GLOBAL_NAME}=${GLOBAL_NAME};}`,
    },
    ...esbuild,
  };
}

async function loadEsbuild(): Promise<typeof import("esbuild")> {
  try {
    return await import("esbuild");
  } catch {
    throw new Error(
      "tvml-react: building requires esbuild. Install it with `npm install -D esbuild`.",
    );
  }
}

/** Copy the bootstrap `Application.js` into the output directory. */
export async function copyBootstrap(outdir: string): Promise<void> {
  await mkdir(outdir, { recursive: true });
  await copyFile(bootstrapPath, path.join(outdir, "Application.js"));
}

/** Build `app.js` and copy `Application.js` next to it. */
export async function build(options: TVMLBuildOptions): Promise<void> {
  const esbuild = await loadEsbuild();
  await copyBootstrap(options.outdir);
  await esbuild.build(tvmlBuildOptions(options));
}

export interface DevServerOptions extends Omit<TVMLBuildOptions, "dev"> {
  /** Defaults to 9001. */
  port?: number;
  /** Defaults to 0.0.0.0 so an Apple TV on the LAN can reach it. */
  host?: string;
}

/**
 * Rebuild on change and serve the output directory. Relaunch the app on the
 * Apple TV (or simulator) to pick up changes.
 */
export async function serve(options: DevServerOptions) {
  const esbuild = await loadEsbuild();
  await copyBootstrap(options.outdir);
  const context = await esbuild.context(
    tvmlBuildOptions({ ...options, dev: true }),
  );
  await context.watch();
  return context.serve({
    servedir: options.outdir,
    port: options.port ?? 9001,
    host: options.host ?? "0.0.0.0",
  });
}

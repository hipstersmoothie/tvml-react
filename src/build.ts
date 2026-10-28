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
  /** Called with each `console.*` call made on the Apple TV. */
  onLog?: (entry: { level: string; args: Array<unknown> }) => void;
}

/** Path the dev bootstrap polls; its presence turns on live reload and logs. */
export const DEV_ENDPOINT = "__tvml-react/dev";
const LOG_ENDPOINT = "__tvml-react/log";

const CONTENT_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

/**
 * Rebuild on change and serve the output directory. The bootstrap notices the
 * dev server and reloads the app after every successful rebuild, and forwards
 * the app's console output to `onLog`.
 */
export async function serve(options: DevServerOptions) {
  const esbuild = await loadEsbuild();
  const http = await import("node:http");
  const { readFile } = await import("node:fs/promises");

  await copyBootstrap(options.outdir);

  let build = 0;
  const base = tvmlBuildOptions({ ...options, dev: true });
  const context = await esbuild.context({
    ...base,
    plugins: [
      ...(base.plugins ?? []),
      {
        name: "tvml-react-reload",
        setup(pluginBuild) {
          pluginBuild.onEnd((result) => {
            if (result.errors.length === 0) build += 1;
          });
        },
      },
    ],
  });
  await context.watch();

  const root = path.resolve(options.outdir);
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const route = url.pathname.replace(/^\/+/, "");
    response.setHeader("Cache-Control", "no-store");

    if (route === DEV_ENDPOINT) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ build }));
      return;
    }

    if (route === LOG_ENDPOINT && request.method === "POST") {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        try {
          options.onLog?.(JSON.parse(body));
        } catch {
          // Ignore malformed log posts.
        }
        response.end();
      });
      return;
    }

    const file = path.resolve(root, route || "index.html");
    if (!file.startsWith(root)) {
      response.statusCode = 403;
      response.end();
      return;
    }
    try {
      const contents = await readFile(file);
      response.setHeader(
        "Content-Type",
        CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
      );
      response.end(contents);
    } catch {
      response.statusCode = 404;
      response.end();
    }
  });

  const port = options.port ?? 9001;
  const host = options.host ?? "0.0.0.0";
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  return {
    port,
    host,
    async close() {
      server.close();
      await context.dispose();
    },
  };
}

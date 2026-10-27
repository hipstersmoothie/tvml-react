#!/usr/bin/env node
import { networkInterfaces } from "node:os";
import { parseArgs } from "node:util";

import { build, serve } from "./build.js";

const USAGE = `Usage:
  tvml-react build <entry> [--outdir dist] [--dev]
  tvml-react dev   <entry> [--outdir dist] [--port 9001] [--host 0.0.0.0]

<entry> must export \`start(options)\`. The output directory gets app.js plus
the bootstrap Application.js; point TVApplicationController at
<server>/Application.js.`;

function lanAddresses(): Array<string> {
  return Object.values(networkInterfaces())
    .flat()
    .filter((info) => info && info.family === "IPv4" && !info.internal)
    .map((info) => info!.address);
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      outdir: { type: "string", default: "dist" },
      dev: { type: "boolean", default: false },
      port: { type: "string", default: "9001" },
      host: { type: "string", default: "0.0.0.0" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const [command, entry] = positionals;
  if (values.help || !entry || (command !== "build" && command !== "dev")) {
    console.log(USAGE);
    process.exit(values.help ? 0 : 1);
  }

  if (command === "build") {
    await build({ entry, outdir: values.outdir, dev: values.dev });
    return;
  }

  const { port } = await serve({
    entry,
    outdir: values.outdir,
    port: Number(values.port),
    host: values.host,
  });
  const hosts =
    values.host === "0.0.0.0" ? ["localhost", ...lanAddresses()] : [values.host];
  console.log("\nServing TVML app. Set TVMLServerURL to one of:");
  for (const host of hosts) {
    console.log(`  http://${host}:${port}/`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

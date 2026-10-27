import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (file: string) =>
  fileURLToPath(new URL(`./src/${file}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^tvml-react\/jsx-runtime$/, replacement: src("jsx-runtime.ts") },
      {
        find: /^tvml-react\/jsx-dev-runtime$/,
        replacement: src("jsx-dev-runtime.ts"),
      },
      { find: /^tvml-react$/, replacement: src("index.ts") },
    ],
  },
  oxc: {
    jsx: { runtime: "automatic", importSource: "tvml-react" },
  },
});

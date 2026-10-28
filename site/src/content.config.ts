import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Learn guides (generated from the README) and Reference symbol pages.
const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    section: z.enum(["learn", "reference"]),
    abstract: z.string(),
    order: z.number().default(100),
    group: z.string().optional(),
    // Reference pages: the exports the page documents, its own symbol first.
    // Module, kind and declarations come from the library's source.
    symbols: z.array(z.string()).default([]),
    // Overrides, for pages about things that aren't TypeScript exports.
    kind: z.enum(["component", "hook", "function", "type", "constant", "article"]).optional(),
    module: z.string().optional(),
    declaration: z.string().optional(),
  }),
});

export const collections = { docs };

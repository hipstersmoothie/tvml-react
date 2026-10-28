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
    // Reference pages only.
    kind: z.enum(["component", "hook", "function", "type", "constant"]).optional(),
    module: z.string().optional(),
    group: z.string().optional(),
    declaration: z.string().optional(),
  }),
});

export const collections = { docs };

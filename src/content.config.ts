import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ── Category Enum ──────────────────────────────────────────────────
const categoryEnum = z.enum([
  'Reverse',
  'Pwn',
  'Web',
  'Crypto',
  'OSINT',
  'Web3',
  'Forensics',
  'Misc',
]);

// ── CTF Writeup Collection ─────────────────────────────────────────
const ctfs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/ctfs' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    ctf_event: z.string(),                 // e.g. "Defcon Quals 2026"
    challenge_name: z.string(),
    category: categoryEnum,
    tags: z.array(z.string()).default([]),
    points: z.number().optional(),
    is_solved: z.boolean().default(true),
    difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Insane']).optional(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// ── Blog Collection ────────────────────────────────────────────────
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { ctfs, blog };

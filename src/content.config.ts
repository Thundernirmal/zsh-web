import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'zod';
import { shellCommandSchema, shellTipSchema } from '@/lib/content-schemas';

const commands = defineCollection({
	loader: file('src/data/commands.json'),
	schema: shellCommandSchema,
});

const tips = defineCollection({
	loader: file('src/data/tips.json'),
	schema: shellTipSchema,
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs/docs' }),
  schema: z.object({ title: z.string(), description: z.string() }),
});
export const collections = { commands, tips, docs };

import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { shellCommandSchema, shellTipSchema } from '@/lib/content-schemas';

const commands = defineCollection({
	loader: file('src/data/commands.json'),
	schema: shellCommandSchema,
});

const tips = defineCollection({
	loader: file('src/data/tips.json'),
	schema: shellTipSchema,
});

export const collections = { commands, tips };

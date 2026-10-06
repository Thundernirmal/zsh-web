import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { shellCommandSchema, shellTipSchema } from '@/lib/content-schemas';

const commands = defineCollection({
	loader: file('src/data/commands.json'),
	schema: shellCommandSchema,
});

const tips = defineCollection({
	loader: file('src/data/tips.json'),
	schema: shellTipSchema,
});

const docs = defineCollection({ loader: docsLoader(), schema: docsSchema() });
const i18n = defineCollection({ loader: i18nLoader(), schema: i18nSchema() });
export const collections = { commands, tips, docs, i18n };

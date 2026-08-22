import { z } from 'astro/zod';

import { categoryOrder } from '@/lib/categories';

export const shellCommandSchema = z
	.object({
		id: z.string().regex(/^command-[a-z0-9_-]+$/),
		name: z.string().min(1),
		command: z.string().min(1).optional(),
		usage: z.string().min(1).optional(),
		description: z.string().min(1).optional(),
		type: z.enum(['alias', 'global_alias', 'function']),
		category: z.enum(categoryOrder).optional(),
		source: z.string().min(1).optional(),
		availability: z.string().min(1).optional(),
		dependencies: z.string().min(1).optional(),
		examples: z.array(z.string().min(1)).optional(),
		features: z.array(z.string().min(1)).optional(),
		notes: z.array(z.string().min(1)).optional(),
		requires: z.array(z.string().min(1)).optional(),
		optional: z.array(z.string().min(1)).optional(),
		interactive: z.boolean().optional(),
		plainMode: z.boolean().optional(),
		richOutput: z.boolean().optional(),
	})
	.strict();

export const shellTipSchema = z
	.object({
		id: z.string().regex(/^tip-[a-z0-9_-]+$/),
		text: z.string().min(1),
		category: z.enum(categoryOrder),
		source: z.string().min(1).optional(),
		availability: z.string().min(1).optional(),
	})
	.strict();

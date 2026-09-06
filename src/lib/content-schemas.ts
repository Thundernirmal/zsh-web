import { z } from 'astro/zod';

import { categoryOrder } from './categories';

export const shellCommandSchema = z
	.object({
		id: z.string().regex(/^command-[a-z0-9_-]+$/),
		name: z.string().min(1),
		canonical: z.string().min(1),
		mutation: z.enum(['read', 'write', 'mixed', 'session']),
		command: z.string().min(1).optional(),
		usage: z.string().min(1).optional(),
		description: z.string().min(1).optional(),
		type: z.enum(['alias', 'global_alias', 'function', 'action']),
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
		terminalAdaptive: z.boolean().optional(),
	})
	.strict();

export const shellTipSchema = z
	.object({
		id: z.string().regex(/^tip-[a-z0-9_-]+$/),
		text: z.string().min(1),
		commandId: z.string().regex(/^command-[a-z0-9_-]+$/).optional(),
		commandName: z.string().min(1).optional(),
		category: z.enum(categoryOrder),
		source: z.string().min(1).optional(),
		availability: z.string().min(1).optional(),
	})
	.strict();

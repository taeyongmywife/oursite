import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const fragments = defineCollection({
	loader: glob({ base: './src/content/fragments', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			type: z.string(),
			subject: z.string(),
			status: z.string(),
			tags: z.array(z.string()).default([]),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			readingTime: z.number().optional(),
			featured: z.boolean().optional().default(false),
		}),
});

const experiments = defineCollection({
	loader: glob({ base: './src/content/experiments', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			objective: z.string(),
			tools: z.array(z.string()),
			lab: z.enum(['AI LAB', 'COMMERCE LAB', 'CREATIVE LAB']),
			status: z.enum(['Ongoing', 'Completed', 'Paused']),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
		}),
});

const cases = defineCollection({
	loader: glob({ base: './src/content/cases', pattern: '**/*.{md,mdx}' }),
	schema: () =>
		z.object({
			title: z.string(),
			observation: z.string(),
			status: z.enum(['Testing', 'Launched', 'Archived']),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
		}),
});

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			excerpt: z.string().optional(),
			category: z.enum(['ai-lab', 'commerce-lab', 'creative-space', 'thinking-notes']),
			subject: z.string().optional(),
			status: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			readingTime: z.number().optional(),
			featured: z.boolean().optional().default(false),
			tags: z.array(z.string()).optional().default([]),
		}),
});

export const collections = { fragments, experiments, cases, blog };

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

const products = defineCollection({
	loader: glob({ base: './src/content/products', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			subject: z.string(),
			category: z.enum(['Tools', 'Knowledge', 'Works']),
			status: z.enum(['Available', 'Pre-order', 'Sold out']),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			coverImage: z.optional(image()),
			price: z.string().optional(),
			purchaseChannel: z.enum(['External', 'Internal', 'Coming soon']).default('Coming soon'),
			externalUrl: z.string().optional(),
			specs: z.object({
				material: z.string().optional(),
				dimensions: z.string().optional(),
				weight: z.string().optional(),
				edition: z.string().optional(),
			}).optional(),
			relatedExperiments: z.array(z.string()).optional().default([]),
			relatedFragments: z.array(z.string()).optional().default([]),
			featured: z.boolean().optional().default(false),
			cmsManaged: z.boolean().optional().default(false),
			stock: z.number().optional(),
		}),
});

const between = defineCollection({
	loader: glob({ base: './src/content/between', pattern: '**/*.{md,mdx}' }),
	schema: () =>
		z.object({
			createdAt: z.coerce.date(),
			keywords: z.array(z.string()).optional().default([]),
			weight: z.number().optional().default(1),
			hidden: z.boolean().optional().default(false),
		}),
});

export const collections = { fragments, experiments, cases, blog, products, between };

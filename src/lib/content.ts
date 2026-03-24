import type { Component } from 'svelte';

const modules = import.meta.glob('../../docs/*.md', { eager: false });
const rawFiles = import.meta.glob('../../docs/*.md', {
	query: '?raw',
	import: 'default',
	eager: false
});

export const slugs = Object.keys(modules)
	.map((p) => p.replace('../../docs/', '').replace(/\.md$/, ''))
	.map((slug) => ({ slug }));

export const nav = await Promise.all(
	slugs.map(async ({ slug }) => {
		const page = await getPage(slug);
		return { slug, title: page?.metadata.title ?? slug };
	})
);

export type Heading = { id: string; text: string; level: 2 | 3 };

function extractHeadings(raw: string): Heading[] {
	return [...raw.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((m) => ({
		level: m[1].length as 2 | 3,
		text: m[2].trim(),
		id: m[2]
			.trim()
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
	}));
}

export async function getPage(slug: string) {
	const key = `../../docs/${slug}.md`;
	if (!(key in modules)) return null;
	const mod = (await modules[key]()) as {
		default: Component;
		metadata: Record<string, string>;
	};
	const raw = (await rawFiles[key]()) as string;
	return {
		component: mod.default,
		metadata: mod.metadata ?? {},
		raw,
		headings: extractHeadings(raw)
	};
}

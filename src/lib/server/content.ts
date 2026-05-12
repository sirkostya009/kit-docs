import rehypeShiki from '@shikijs/rehype';
import matter from 'gray-matter';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const rawFiles = import.meta.glob('../../../docs/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: false
});

export const slugs = Object.keys(rawFiles)
	.map((p) => p.replace('../../../docs/', '').replace(/\.md$/, ''))
	.map((slug) => ({ slug }));

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings, {
		behavior: 'append',
		content: { type: 'text', value: ' #' }
	})
	.use(rehypeShiki, {
		themes: { light: 'github-light', dark: 'github-dark' },
		defaultColor: false,
		defaultLanguage: 'text',
		fallbackLanguage: 'text'
	})
	.use(rehypeStringify);

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
	const key = `../../../docs/${slug}.md`;
	if (!(key in rawFiles)) return null;
	const raw = (await rawFiles[key]()) as string;
	const { data: metadata, content } = matter(raw);
	const html = String(await processor.process(content));
	return {
		html,
		metadata: metadata as Record<string, string>,
		raw,
		headings: extractHeadings(content)
	};
}

export type NavItem = { slug: string; title: string };
export type NavTree = { top: NavItem[]; groups: { name: string; items: NavItem[] }[] };

export const nav: NavItem[] = await Promise.all(
	slugs.map(async ({ slug }) => {
		const page = await getPage(slug);
		return { slug, title: page?.metadata.title ?? slug };
	})
);

export const navTree: NavTree = (() => {
	const top: NavItem[] = [];
	const groupMap = new Map<string, NavItem[]>();
	for (const item of nav) {
		const idx = item.slug.indexOf('/');
		if (idx === -1) top.push(item);
		else {
			const group = item.slug.slice(0, idx);
			const items = groupMap.get(group) ?? [];
			items.push(item);
			groupMap.set(group, items);
		}
	}
	return {
		top,
		groups: [...groupMap].map(([name, items]) => ({ name, items }))
	};
})();

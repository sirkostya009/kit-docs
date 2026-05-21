import rehypeShiki from '@shikijs/rehype';
import {
	transformerMetaHighlight,
	transformerNotationDiff,
	transformerNotationHighlight,
} from '@shikijs/transformers';
import matter from 'gray-matter';
import { execSync } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import type { ShikiTransformer } from 'shiki';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

const rawFiles = import.meta.glob('../../../docs/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: false,
});

const ORDER_PREFIX = /(^|\/)\d+_/g;

type Entry = { slug: string; key: string; path: string };

const entries: Entry[] = Object.keys(rawFiles)
	.sort()
	.map((key) => {
		const path = key.replace('../../../docs/', '');
		const slug = path.replace(ORDER_PREFIX, '$1').replace(/\.md$/, '');
		return { slug, key, path };
	});

const slugToEntry = new Map(entries.map((e) => [e.slug, e]));

export const slugs = entries.map(({ slug }) => ({ slug }));

const ADMONITION_NAMES = new Set(['note', 'tip', 'info', 'warning', 'caution', 'danger']);

function remarkAdmonitions() {
	return (tree: unknown) => {
		visit(tree as Parameters<typeof visit>[0], (node) => {
			if (node.type !== 'containerDirective') return;
			const directive = node as unknown as {
				name: string;
				attributes?: Record<string, string | null>;
				children: Array<Record<string, unknown>>;
				data?: Record<string, unknown>;
			};
			if (!ADMONITION_NAMES.has(directive.name)) return;

			let title: string | undefined = directive.attributes?.title ?? undefined;
			const first = directive.children[0] as
				| { data?: { directiveLabel?: boolean }; children?: Array<{ value?: string }> }
				| undefined;
			if (first?.data?.directiveLabel) {
				title = first.children?.[0]?.value ?? title;
				directive.children.shift();
			}

			directive.data ??= {};
			directive.data.hName = 'aside';
			directive.data.hProperties = {
				className: ['admonition', `admonition-${directive.name}`],
				role: 'note',
			};

			directive.children.unshift({
				type: 'paragraph',
				data: {
					hName: 'p',
					hProperties: { className: ['admonition-title'] },
				},
				children: [{ type: 'text', value: title ?? directive.name }],
			} as never);
		});
	};
}

function transformerTitle(): ShikiTransformer {
	return {
		name: 'title',
		pre(node) {
			const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw;
			if (!raw) return;
			const match = raw.match(/title=["']([^"']+)["']/);
			if (!match) return;
			node.properties ??= {};
			node.properties['data-title'] = match[1];
		},
	};
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkDirective)
	.use(remarkAdmonitions)
	.use(remarkRehype)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings, {
		behavior: 'append',
		content: { type: 'text', value: ' #' },
	})
	.use(rehypeShiki, {
		themes: { light: 'github-light', dark: 'github-dark' },
		defaultColor: false,
		defaultLanguage: 'text',
		fallbackLanguage: 'text',
		transformers: [
			transformerNotationHighlight(),
			transformerNotationDiff(),
			transformerMetaHighlight(),
			transformerTitle(),
		],
	})
	.use(rehypeStringify);

export type Heading = { id: string; text: string; level: 2 | 3 };

function extractHeadings(raw: string): Heading[] {
	const out: Heading[] = [];
	let fence: string | null = null;
	for (const line of raw.split('\n')) {
		const fenceMatch = line.match(/^(\s{0,3})(`{3,}|~{3,})/);
		if (fenceMatch) {
			const marker = fenceMatch[2];
			if (fence === null) fence = marker;
			else if (line.trim().startsWith(fence) && line.trim().length >= fence.length) fence = null;
			continue;
		}
		if (fence !== null) continue;
		const m = line.match(/^(#{2,3})\s+(.+)$/);
		if (!m) continue;
		const text = m[2].trim();
		out.push({
			level: m[1].length as 2 | 3,
			text,
			id: text
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-'),
		});
	}
	return out;
}

const lastModifiedCache = new Map<string, string | null>();

function gitLastModified(relPath: string): string | null {
	if (lastModifiedCache.has(relPath)) return lastModifiedCache.get(relPath)!;
	let value: string | null;
	try {
		const path = resolvePath(process.cwd(), 'docs', relPath);
		const out = execSync(`git log -1 --format=%cI -- "${path}"`, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
		value = out || null;
	} catch {
		value = null;
	}
	lastModifiedCache.set(relPath, value);
	return value;
}

export async function getPage(slug: string) {
	const entry = slugToEntry.get(slug);
	if (!entry) return null;
	const raw = (await rawFiles[entry.key]()) as string;
	const { data: metadata, content } = matter(raw);
	const html = String(await processor.process(content));
	return {
		html,
		metadata: metadata as Record<string, string>,
		raw,
		headings: extractHeadings(content),
		lastModified: (metadata.lastModified as string | undefined) ?? gitLastModified(entry.path),
	};
}

export type NavItem = { slug: string; title: string; lastModified: string | null };
export type NavTree = { top: NavItem[]; groups: { name: string; items: NavItem[] }[] };

export const nav: NavItem[] = await Promise.all(
	slugs.map(async ({ slug }) => {
		const page = await getPage(slug);
		return {
			slug,
			title: page?.metadata.title ?? slug,
			lastModified: page?.lastModified ?? null,
		};
	}),
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
		groups: [...groupMap].map(([name, items]) => ({ name, items })),
	};
})();

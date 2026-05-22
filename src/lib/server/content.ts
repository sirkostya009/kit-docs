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

type MdastNode = {
	type: string;
	value?: string;
	children?: MdastNode[];
	data?: Record<string, unknown>;
};

function textContent(nodes: MdastNode[] | undefined): string {
	if (!nodes) return '';
	let out = '';
	for (const n of nodes) {
		if (n.type === 'text' && typeof n.value === 'string') out += n.value;
		else if (n.children) out += textContent(n.children);
	}
	return out;
}

function remarkTabs() {
	return (tree: unknown) => {
		visit(tree as Parameters<typeof visit>[0], (node) => {
			if (node.type !== 'containerDirective') return;
			const directive = node as unknown as {
				name: string;
				attributes?: Record<string, string | null>;
				children: MdastNode[];
				data?: Record<string, unknown>;
			};
			if (directive.name !== 'tabs') return;

			const groupId = directive.attributes?.groupId ?? directive.attributes?.id ?? null;
			const panels: Array<{ label: string; nodes: MdastNode[] }> = [];
			let current: { label: string; nodes: MdastNode[] } | null = null;

			for (const child of directive.children) {
				if (child.type === 'leafDirective') {
					const leaf = child as unknown as {
						name: string;
						attributes?: Record<string, string | null>;
						children?: MdastNode[];
					};
					if (leaf.name === 'tab') {
						const label = textContent(leaf.children) || leaf.attributes?.label || '';
						current = { label, nodes: [] };
						panels.push(current);
						continue;
					}
				}
				if (current) current.nodes.push(child);
			}

			if (panels.length === 0) return;

			const tablistChildren = panels.map((p, i) => ({
				type: 'element',
				tagName: 'button',
				properties: {
					type: 'button',
					role: 'tab',
					className: ['tabs-tab'],
					'data-tab-index': String(i),
					'aria-selected': i === 0 ? 'true' : 'false',
					tabIndex: i === 0 ? 0 : -1,
				},
				children: [{ type: 'text', value: p.label }],
			}));

			const tablist: MdastNode = {
				type: 'paragraph',
				data: {
					hName: 'div',
					hProperties: { className: ['tabs-list'], role: 'tablist' },
					hChildren: tablistChildren,
				},
				children: [],
			};

			const panelNodes: MdastNode[] = panels.map((p, i) => {
				const properties: Record<string, unknown> = {
					className: ['tabs-panel'],
					role: 'tabpanel',
					'data-tab-index': String(i),
				};
				if (i !== 0) properties.hidden = true;
				return {
					type: 'paragraph',
					data: { hName: 'div', hProperties: properties },
					children: p.nodes,
				};
			});

			directive.data ??= {};
			directive.data.hName = 'div';
			const hProperties: Record<string, unknown> = { className: ['tabs'] };
			if (groupId) hProperties['data-tabs-group'] = groupId;
			directive.data.hProperties = hProperties;
			directive.children = [tablist, ...panelNodes];
		});
	};
}

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
			directive.data.hName = 'div';
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

function transformerLang(): ShikiTransformer {
	return {
		name: 'lang',
		pre(node) {
			const lang = (this.options as { lang?: string }).lang;
			if (!lang || lang === 'text' || lang === 'plain' || lang === 'plaintext') return;
			node.properties ??= {};
			node.properties['data-lang'] = lang;
		},
	};
}

function transformerLineNumbers(): ShikiTransformer {
	return {
		name: 'line-numbers',
		pre(node) {
			const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw;
			if (!raw || !/\bshowLineNumbers\b/.test(raw)) return;
			node.properties ??= {};
			node.properties['data-line-numbers'] = '';
		},
	};
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkDirective)
	.use(remarkTabs)
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
		inline: 'tailing-curly-colon',
		transformers: [
			transformerNotationHighlight(),
			transformerNotationDiff(),
			transformerMetaHighlight(),
			transformerTitle(),
			transformerLang(),
			transformerLineNumbers(),
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
export type NavLeaf = { kind: 'leaf' } & NavItem;
export type NavGroup = { kind: 'group'; name: string; prefix: string; children: NavNode[] };
export type NavNode = NavLeaf | NavGroup;
export type NavTree = { top: NavLeaf[]; groups: NavGroup[] };

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

function partition(items: NavItem[], depth: number, parentPrefix: string): NavTree {
	const top: NavLeaf[] = [];
	const buckets = new Map<string, NavItem[]>();
	for (const item of items) {
		const parts = item.slug.split('/');
		if (parts.length === depth + 1) {
			top.push({ kind: 'leaf', ...item });
		} else {
			const name = parts[depth];
			const bucket = buckets.get(name) ?? [];
			bucket.push(item);
			buckets.set(name, bucket);
		}
	}
	const groups: NavGroup[] = [...buckets].map(([name, items]) => {
		const prefix = parentPrefix ? `${parentPrefix}/${name}` : name;
		const sub = partition(items, depth + 1, prefix);
		return { kind: 'group', name, prefix, children: [...sub.top, ...sub.groups] };
	});
	return { top, groups };
}

export const navTree: NavTree = partition(nav, 0, '');

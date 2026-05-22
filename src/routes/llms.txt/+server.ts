import { pages } from '$lib/server/content';
import { partition, type NavGroup, type NavLeaf } from '$lib/nav';
import { origin } from '$lib/server/origin';

export const prerender = true;

function descriptionOf(slug: string): string {
	const desc = pages.get(slug)?.metadata.description;
	return desc ? `: ${desc}` : '';
}

function leafLine(leaf: NavLeaf): string {
	return `- [${leaf.title}](${origin}/${leaf.slug}.md)${descriptionOf(leaf.slug)}`;
}

function formatGroup(group: NavGroup, level: number): string {
	const heading = `${'#'.repeat(level)} ${humanize(group.name)}`;
	const lines: string[] = [heading, ''];
	for (const child of group.children) {
		if (child.kind === 'leaf') lines.push(leafLine(child));
	}
	lines.push('');
	for (const child of group.children) {
		if (child.kind === 'group') lines.push(formatGroup(child, level + 1));
	}
	return lines.join('\n');
}

function humanize(name: string): string {
	return name
		.replace(/^\d+_/, '')
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GET() {
	const nav: Record<string, string> = {};
	for (const [slug, page] of pages) nav[slug] = page.metadata.title ?? slug;
	const tree = partition(nav);

	const out: string[] = ['# kit-docs', '', '> Documentation site built with SvelteKit.', ''];

	if (tree.top.length > 0) {
		out.push('## Pages', '');
		for (const leaf of tree.top) out.push(leafLine(leaf));
		out.push('');
	}

	for (const group of tree.groups) {
		out.push(formatGroup(group, 2));
	}

	return new Response(out.join('\n'), {
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	});
}

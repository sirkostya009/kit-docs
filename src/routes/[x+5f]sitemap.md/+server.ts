import { pages } from '$lib/server/content';
import { origin } from '$lib/server/origin';

export const prerender = true;

export function GET() {
	const lines: string[] = ['# Sitemap', ''];
	for (const [slug, page] of pages) {
		const title = page.metadata.title ?? slug;
		lines.push(`- [${title}](${origin}/${slug}.md)`);
	}
	lines.push('');
	return new Response(lines.join('\n'), {
		headers: { 'content-type': 'text/markdown; charset=utf-8' },
	});
}

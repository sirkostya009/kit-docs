import { slugs } from '$lib/server/content/entries';
import { pages } from '$lib/server/content/pages';
import { origin } from '$lib/server/origin';
import { projectName } from '$lib/server/project-name';
import { error } from '@sveltejs/kit';

export const prerender = true;

export const entries = () => slugs;

export function GET({ params }) {
	const page = pages.get(params.slug);
	if (!page) error(404);
	const preamble = `> This is official ${projectName} documentation. See [full sitemap](${origin}/_sitemap.md) for all pages.\n\n`;
	return new Response(preamble + page.raw, {
		headers: { 'content-type': 'text/markdown; charset=utf-8' },
	});
}

import { getPage, nav, slugs } from '$lib/server/content';
import { error } from '@sveltejs/kit';

export const prerender = true;

export const entries = () => slugs;

export async function load({ params }) {
	const page = await getPage(params.slug);
	if (!page) error(404);
	const idx = nav.findIndex((n) => n.slug === params.slug);
	return {
		slug: params.slug,
		html: page.html,
		metadata: page.metadata,
		headings: page.headings,
		lastModified: page.lastModified,
		prev: idx > 0 ? nav[idx - 1] : null,
		next: idx >= 0 && idx < nav.length - 1 ? nav[idx + 1] : null,
	};
}

import { lastModified, pages, slugs } from '$lib/server/content';
import { error } from '@sveltejs/kit';

export const prerender = true;

export const entries = () => slugs;

export function load({ params }) {
	const page = pages.get(params.slug);
	if (!page) error(404);
	return {
		html: page.html,
		metadata: page.metadata,
		headings: page.headings,
		lastModified: lastModified.get(params.slug) ?? null,
	};
}

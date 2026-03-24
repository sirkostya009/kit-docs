import { getPage, slugs } from '$lib/content';
import { error } from '@sveltejs/kit';

export const prerender = true;

export const entries = () => slugs;

export async function load({ params }) {
	const page = await getPage(params.slug);
	if (!page) error(404);
	return {
		slug: params.slug,
		component: page.component,
		metadata: page.metadata,
		headings: page.headings
	};
}

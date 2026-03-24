import { getPage, slugs } from '$lib/content';
import { error } from '@sveltejs/kit';
import type { EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => slugs;

export async function GET({ params }) {
	const page = await getPage(params.slug);
	if (!page) error(404);
	return new Response(page.raw, {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
}

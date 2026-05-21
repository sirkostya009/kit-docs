import { origin } from '$lib/server/origin';

export const prerender = true;

export function GET() {
	const body = `User-agent: *
Disallow: /*.md$

Sitemap: ${origin}/sitemap.xml
`;

	return new Response(body, {
		headers: { 'content-type': 'text/plain' },
	});
}

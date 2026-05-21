import { env } from '$env/dynamic/private';

export const prerender = true;

const origin =
	env.ORIGIN ??
	env.PUBLIC_ORIGIN ??
	(env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`) ??
	'http://localhost:5173';

export function GET() {
	const body = `User-agent: *
Disallow: /*.md$

Sitemap: ${origin}/sitemap.xml
`;

	return new Response(body, {
		headers: { 'content-type': 'text/plain' },
	});
}

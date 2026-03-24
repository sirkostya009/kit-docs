import { env } from '$env/dynamic/private';
import { slugs } from '$lib/content';

export const prerender = true;

function origin() {
	if (env.ORIGIN) return env.ORIGIN;
	if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
	return 'http://localhost:5173';
}

export function GET() {
	const pages = [
		{ path: '/', priority: '1.0' },
		...slugs.map(({ slug }) => ({ path: `/${slug}.html`, priority: '0.8' }))
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		({ path, priority }) => `\t<url>
\t\t<loc>${origin()}${path}</loc>
\t\t<priority>${priority}</priority>
\t</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'content-type': 'application/xml' }
	});
}

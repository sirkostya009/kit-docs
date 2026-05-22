import { lastModified, nav } from '$lib/server/content';
import { origin } from '$lib/server/origin';

export const prerender = true;

export function GET() {
	const pages = [
		{ path: '/', priority: '1.0', lastModified: null as string | null },
		...Object.keys(nav).map((slug) => ({
			path: `/${slug}.html`,
			priority: '0.8',
			lastModified: lastModified.get(slug) ?? null,
		})),
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		({ path, priority, lastModified }) => `\t<url>
\t\t<loc>${origin}${path}</loc>${lastModified ? `\n\t\t<lastmod>${lastModified}</lastmod>` : ''}
\t\t<priority>${priority}</priority>
\t</url>`,
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'content-type': 'application/xml' },
	});
}

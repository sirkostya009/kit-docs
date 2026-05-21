import { getPage, nav } from '$lib/server/content';

export const prerender = true;

export async function GET() {
	const entries = await Promise.all(
		nav.map(async ({ slug }) => {
			const page = await getPage(slug);
			if (!page) return null;
			const text = page.raw
				.replace(/^---[\s\S]*?---\n/, '')
				.replace(/```[\s\S]*?```/g, ' ')
				.replace(/`[^`]*`/g, ' ')
				.replace(/[#*_>[\]!\\]/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
			return {
				slug,
				title: page.metadata.title ?? slug,
				description: page.metadata.description ?? '',
				headings: page.headings.map((h) => ({ id: h.id, text: h.text })),
				content: text.slice(0, 8000),
			};
		}),
	);

	return Response.json(entries.filter(Boolean), {
		headers: { 'content-type': 'application/json' },
	});
}

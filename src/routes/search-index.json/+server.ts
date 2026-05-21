import { getPage, nav } from '$lib/server/content';
import MiniSearch from 'minisearch';

export const prerender = true;

export async function GET() {
	type Doc = {
		id: string;
		slug: string;
		section: string;
		title: string;
		description: string;
		headings: { id: string; text: string }[];
		headingsText: string;
		content: string;
	};

	const docs = (
		await Promise.all(
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
				const idx = slug.indexOf('/');
				const section = idx === -1 ? '' : slug.slice(0, idx);
				const headings = page.headings.map((h) => ({ id: h.id, text: h.text }));
				return {
					id: slug,
					slug,
					section,
					title: page.metadata.title ?? slug,
					description: page.metadata.description ?? '',
					headings,
					headingsText: headings.map((h) => h.text).join(' '),
					content: text.slice(0, 8000),
				} satisfies Doc;
			}),
		)
	).filter((d): d is Doc => d !== null);

	const mini = new MiniSearch<Doc>({
		idField: 'id',
		fields: ['title', 'headingsText', 'description', 'content'],
		storeFields: ['slug', 'section', 'title', 'description', 'headings', 'content'],
	});
	mini.addAll(docs);

	const sections = [...new Set(docs.map((d) => d.section).filter(Boolean))].sort();

	return Response.json({ sections, index: mini });
}

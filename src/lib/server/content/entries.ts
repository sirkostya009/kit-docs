const rawFiles = import.meta.glob('../../../../docs/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: false,
});

const ORDER_PREFIX = /(^|\/)\d+_/g;

export type Entry = { slug: string; key: string; path: string };

export const entries: Entry[] = Object.keys(rawFiles)
	.sort()
	.map((key) => {
		const path = key.replace('../../../../docs/', '');
		const slug = path.replace(ORDER_PREFIX, '$1').replace(/\.md$/, '');
		return { slug, key, path };
	});

export const slugs = entries.map(({ slug }) => ({ slug }));

export async function readRaw(entry: Entry): Promise<string> {
	return (await rawFiles[entry.key]()) as string;
}

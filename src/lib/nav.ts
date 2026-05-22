export type NavLeaf = { kind: 'leaf'; slug: string; title: string };
export type NavGroup = { kind: 'group'; name: string; prefix: string; children: NavNode[] };
export type NavNode = NavLeaf | NavGroup;
export type NavTree = { top: NavLeaf[]; groups: NavGroup[] };

type Entry = [slug: string, title: string];

function partitionEntries(items: Iterable<Entry>, depth: number, parentPrefix: string): NavTree {
	const top: NavLeaf[] = [];
	const buckets = new Map<string, Entry[]>();
	for (const item of items) {
		const [slug] = item;
		const parts = slug.split('/');
		if (parts.length === depth + 1) {
			top.push({ kind: 'leaf', slug, title: item[1] });
		} else {
			const name = parts[depth];
			const bucket = buckets.get(name) ?? [];
			bucket.push(item);
			buckets.set(name, bucket);
		}
	}
	const groups: NavGroup[] = buckets
		.entries()
		.map(([name, items]) => {
			const prefix = parentPrefix ? `${parentPrefix}/${name}` : name;
			const sub = partitionEntries(items, depth + 1, prefix);
			return {
				kind: 'group',
				name,
				prefix,
				children: [...sub.top, ...sub.groups],
			} satisfies NavGroup;
		})
		.toArray();
	return { top, groups };
}

export function partition(nav: Record<string, string>): NavTree {
	return partitionEntries(Object.entries(nav), 0, '');
}

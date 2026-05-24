export type Heading = { id: string; text: string; level: 2 | 3 };

export function extractHeadings(raw: string): Heading[] {
	const out: Heading[] = [];
	let fence: string | null = null;
	for (const line of raw.split('\n')) {
		const fenceMatch = line.match(/^(\s{0,3})(`{3,}|~{3,})/);
		if (fenceMatch) {
			const marker = fenceMatch[2];
			if (fence === null) fence = marker;
			else if (line.trim().startsWith(fence) && line.trim().length >= fence.length) fence = null;
			continue;
		}
		if (fence !== null) continue;
		const m = line.match(/^(#{2,3})\s+(.+)$/);
		if (!m) continue;
		const text = m[2].trim();
		out.push({
			level: m[1].length as 2 | 3,
			text,
			id: text
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-'),
		});
	}
	return out;
}

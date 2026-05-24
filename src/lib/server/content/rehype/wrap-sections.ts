interface HastNode {
	type: string;
	tagName?: string;
	properties?: Record<string, unknown>;
	children?: HastNode[];
}

export default function rehypeWrapSections() {
	return (tree: unknown) => {
		const root = tree as { children: HastNode[] };
		const wrapped: HastNode[] = [];
		let section: HastNode | null = null;

		for (const node of root.children) {
			if (node.type === 'element' && node.tagName === 'h2') {
				if (section) wrapped.push(section);
				const id = (node.properties?.id as string | undefined) ?? null;
				if (id && node.properties) node.properties.id = `${id}-heading`;
				section = {
					type: 'element',
					tagName: 'section',
					properties: id ? { id } : {},
					children: [
						{
							type: 'element',
							tagName: 'header',
							properties: {},
							children: [node],
						},
					],
				};
				continue;
			}
			if (section) section.children!.push(node);
			else wrapped.push(node);
		}
		if (section) wrapped.push(section);
		root.children = wrapped;
	};
}

import { textContent, walk, type MdastNode } from './utils';

export default function remarkTabs() {
	return (tree: unknown) => {
		for (const node of walk(tree as MdastNode)) {
			if (node.type !== 'containerDirective') continue;
			const directive = node as unknown as {
				name: string;
				attributes?: Record<string, string | null>;
				children: MdastNode[];
				data?: Record<string, unknown>;
			};
			if (directive.name !== 'tabs') continue;

			const groupId = directive.attributes?.groupId ?? directive.attributes?.id ?? null;
			const panels: Array<{ label: string; nodes: MdastNode[] }> = [];
			let current: { label: string; nodes: MdastNode[] } | null = null;

			for (const child of directive.children) {
				if (child.type === 'leafDirective') {
					const leaf = child as unknown as {
						name: string;
						attributes?: Record<string, string | null>;
						children?: MdastNode[];
					};
					if (leaf.name === 'tab') {
						const label = textContent(leaf.children) || leaf.attributes?.label || '';
						current = { label, nodes: [] };
						panels.push(current);
						continue;
					}
				}
				if (current) current.nodes.push(child);
			}

			if (panels.length === 0) continue;

			const tablistChildren = panels.map((p, i) => ({
				type: 'element',
				tagName: 'button',
				properties: {
					type: 'button',
					role: 'tab',
					className: ['tabs-tab'],
					'data-tab-index': String(i),
					'aria-selected': i === 0 ? 'true' : 'false',
					tabIndex: i === 0 ? 0 : -1,
				},
				children: [{ type: 'text', value: p.label }],
			}));

			const tablist: MdastNode = {
				type: 'paragraph',
				data: {
					hName: 'div',
					hProperties: { className: ['tabs-list'], role: 'tablist' },
					hChildren: tablistChildren,
				},
				children: [],
			};

			const panelNodes: MdastNode[] = panels.map((p, i) => {
				const properties: Record<string, unknown> = {
					className: ['tabs-panel'],
					role: 'tabpanel',
					'data-tab-index': String(i),
				};
				if (i !== 0) properties.hidden = true;
				return {
					type: 'paragraph',
					data: { hName: 'div', hProperties: properties },
					children: p.nodes,
				};
			});

			directive.data ??= {};
			directive.data.hName = 'div';
			const hProperties: Record<string, unknown> = { className: ['tabs'] };
			if (groupId) hProperties['data-tabs-group'] = groupId;
			directive.data.hProperties = hProperties;
			directive.children = [tablist, ...panelNodes];
		}
	};
}

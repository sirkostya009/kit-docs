import { isElement, type HastNode } from './utils';

export default function rehypeWrapTables() {
	return (tree: unknown) => {
		walk(tree as { children?: HastNode[] });
	};
}

function walk(node: { children?: HastNode[] }) {
	if (!node.children) return;
	const out: HastNode[] = [];
	for (const child of node.children) {
		if (isElement(child) && child.tagName === 'table') {
			out.push({
				type: 'element',
				tagName: 'div',
				properties: { className: ['table-wrap'] },
				children: [child],
			});
		} else {
			out.push(child);
		}
		if (isElement(child)) walk(child);
	}
	node.children = out;
}

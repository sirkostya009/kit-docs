export interface MdastNode {
	type: string;
	value?: string;
	children?: MdastNode[];
	data?: Record<string, unknown>;
}

export function* walk(node: MdastNode): Generator<MdastNode> {
	yield node;
	const kids = node.children;
	if (!kids) return;
	for (const c of kids.slice()) yield* walk(c);
}

export function textContent(nodes: MdastNode[] | undefined, parts: string[] = []): string {
	if (!nodes) return '';
	const sub = parts.length > 0;
	for (const n of nodes) {
		if (n.type === 'text' && typeof n.value === 'string') parts.push(n.value);
		else if (n.children) textContent(n.children, parts);
	}
	// dont run join again for recursive calls
	if (sub) return '';
	return parts.join('');
}

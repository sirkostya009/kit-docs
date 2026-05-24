import { walk, type MdastNode } from './utils';

export default function remarkEquation() {
	return (tree: unknown) => {
		for (const node of walk(tree as MdastNode)) {
			if (node.type !== 'containerDirective') continue;
			const directive = node as unknown as {
				name: string;
				children: Array<Record<string, unknown>>;
				data?: Record<string, unknown>;
			};
			if (directive.name !== 'equation') continue;

			let caption: string | undefined;
			const first = directive.children[0] as
				| { data?: { directiveLabel?: boolean }; children?: MdastNode[] }
				| undefined;
			if (first?.data?.directiveLabel) {
				caption = first.children?.[0]?.value;
				directive.children.shift();
			}

			directive.data ??= {};
			directive.data.hName = 'figure';
			directive.data.hProperties = { className: ['equation'] };

			if (caption) {
				directive.children.push({
					type: 'paragraph',
					data: { hName: 'figcaption' },
					children: [{ type: 'text', value: caption }],
				} as never);
			}
		}
	};
}

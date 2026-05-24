import { walk, type MdastNode } from './utils';

const ADMONITION_NAMES = new Set(['note', 'tip', 'info', 'warning', 'caution', 'danger']);

export default function remarkAdmonitions() {
	return (tree: unknown) => {
		for (const node of walk(tree as MdastNode)) {
			if (node.type !== 'containerDirective') continue;
			const directive = node as unknown as {
				name: string;
				attributes?: Record<string, string | null>;
				children: Array<Record<string, unknown>>;
				data?: Record<string, unknown>;
			};
			if (!ADMONITION_NAMES.has(directive.name)) continue;

			let title: string | undefined = directive.attributes?.title ?? undefined;
			const first = directive.children[0] as
				| { data?: { directiveLabel?: boolean }; children?: Array<{ value?: string }> }
				| undefined;
			if (first?.data?.directiveLabel) {
				title = first.children?.[0]?.value ?? title;
				directive.children.shift();
			}

			directive.data ??= {};
			directive.data.hName = 'div';
			directive.data.hProperties = {
				className: ['admonition', `admonition-${directive.name}`],
				role: 'note',
			};

			directive.children.unshift({
				type: 'paragraph',
				data: {
					hName: 'p',
					hProperties: { className: ['admonition-title'] },
				},
				children: [{ type: 'text', value: title ?? directive.name }],
			} as never);
		}
	};
}

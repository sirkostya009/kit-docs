import { textContent, walk, type MdastNode } from './utils';

const ROUTE_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export default function remarkRoute() {
	return (tree: unknown) => {
		for (const node of walk(tree as MdastNode)) {
			if (node.type !== 'leafDirective' && node.type !== 'textDirective') continue;
			const directive = node as unknown as {
				name: string;
				attributes?: Record<string, string | null>;
				children: MdastNode[];
				data?: Record<string, unknown>;
			};
			if (directive.name !== 'route') continue;

			const label = textContent(directive.children).trim();
			const [labelMethod, ...labelPathParts] = label.split(/\s+/);
			const rawMethod = (directive.attributes?.method ?? labelMethod ?? 'GET').toUpperCase();
			const method = ROUTE_METHODS.has(rawMethod) ? rawMethod : 'GET';
			const path = directive.attributes?.path ?? labelPathParts.join(' ');

			directive.data ??= {};
			directive.data.hName = 'div';
			directive.data.hProperties = {
				className: ['route', `route-${method.toLowerCase()}`],
			};
			directive.children = [
				{
					type: 'paragraph',
					data: {
						hName: 'span',
						hProperties: { className: ['route-method'] },
					},
					children: [{ type: 'text', value: method }],
				},
				{
					type: 'paragraph',
					data: {
						hName: 'code',
						hProperties: { className: ['route-path'] },
					},
					children: [{ type: 'text', value: path }],
				},
			];
		}
	};
}

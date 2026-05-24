import type { ShikiTransformer } from 'shiki';

export function transformerTitle(): ShikiTransformer {
	return {
		name: 'title',
		pre(node) {
			const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw;
			if (!raw) return;
			const match = raw.match(/title=["']([^"']+)["']/);
			if (!match) return;
			node.properties ??= {};
			node.properties['data-title'] = match[1];
		},
	};
}

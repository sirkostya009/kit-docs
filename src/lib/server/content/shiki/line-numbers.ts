import type { ShikiTransformer } from 'shiki';

export function transformerLineNumbers(): ShikiTransformer {
	return {
		name: 'line-numbers',
		pre(node) {
			const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw;
			if (!raw || !/\bshowLineNumbers\b/.test(raw)) return;
			node.properties ??= {};
			node.properties['data-line-numbers'] = '';
		},
	};
}

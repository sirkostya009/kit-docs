import type { ShikiTransformer } from 'shiki';

export function transformerLang(): ShikiTransformer {
	return {
		name: 'lang',
		pre(node) {
			const lang = (this.options as { lang?: string }).lang;
			if (!lang || lang === 'text' || lang === 'plain' || lang === 'plaintext') return;
			node.properties ??= {};
			node.properties['data-lang'] = lang;
		},
	};
}

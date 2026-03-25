import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkFootnotes from 'remark-footnotes';
import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: ['typescript', 'javascript', 'bash', 'diff', 'svelte', 'html', 'css', 'json', 'markdown']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ precompress: true })
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	},
	preprocess: [
		mdsvex({
			extensions: ['.svx', '.md'],
			remarkPlugins: [remarkFootnotes],
			rehypePlugins: [
				rehypeSlug,
				[rehypeAutolinkHeadings, { behavior: 'append', content: { type: 'text', value: ' #' } }]
			],
			highlight: {
				highlighter: (code, lang) => {
					const html = highlighter.codeToHtml(code, {
						lang: lang ?? 'text',
						themes: { light: 'github-light', dark: 'github-dark' },
						defaultColor: false
					});
					const escaped = html.replaceAll('`', '\\`').replaceAll('${', '\\${');
					return `{@html \`${escaped}\`}`;
				}
			}
		})
	],
	extensions: ['.svelte', '.svx', '.md'],
	compilerOptions: { experimental: { async: true } }
};

export default config;

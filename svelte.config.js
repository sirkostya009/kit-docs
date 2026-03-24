import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';
import remarkFootnotes from 'remark-footnotes';
import rehypeSlug from 'rehype-slug';

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
			rehypePlugins: [rehypeSlug],
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

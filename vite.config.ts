import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { checkFrontmatter } from './scripts/check-frontmatter.js';

function frontmatterCheck(): Plugin {
	return {
		name: 'kit-docs:frontmatter-check',
		apply: 'build',
		buildStart() {
			const { errors, count } = checkFrontmatter(resolve(process.cwd(), 'docs'));
			if (errors.length) {
				for (const e of errors) this.warn(e);
				this.error(`frontmatter check failed: ${errors.length} error(s) in ${count} file(s)`);
			}
		},
	};
}

export default defineConfig({
	plugins: [frontmatterCheck(), tailwindcss(), sveltekit()],
	ssr: { external: ['mermaid-isomorphic', 'playwright'] },
});

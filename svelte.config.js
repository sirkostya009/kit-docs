import adapter from '@sveltejs/adapter-static';
import { resolve } from 'node:path';
import { checkLinks } from './scripts/check-links.js';

/** wrap adapter-static so the link check runs as the final step of `vite build`
 *  and a failure aborts the build (the adapter's `adapt()` is awaited by kit). */
function adapterWithLinkCheck(/** @type {Parameters<typeof adapter>[0]} */ opts) {
	const base = adapter(opts);
	return {
		name: base.name,
		/** @param {Parameters<typeof base.adapt>[0]} builder */
		async adapt(builder) {
			await base.adapt(builder);
			const buildDir = resolve(process.cwd(), 'build');
			const { errors } = checkLinks(buildDir);
			if (errors.length) {
				for (const e of errors) builder.log.error(e);
				throw new Error(`broken link check failed: ${errors.length} dead target(s)`);
			}
		},
	};
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapterWithLinkCheck({ precompress: true }),
		prerender: { handleMissingId: 'warn', entries: ['*', '/_sitemap.md'] },
	},
	vitePlugin: {
		inspector: {
			toggleKeyCombo: 'meta-shift',
			holdMode: true,
			showToggleButton: 'active',
			toggleButtonPos: 'bottom-right',
		},
	},
	compilerOptions: { experimental: { async: true } },
};

export default config;

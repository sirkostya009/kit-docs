import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ precompress: true }),
		prerender: { handleMissingId: 'warn' }
	},
	vitePlugin: {
		inspector: {
			toggleKeyCombo: 'meta-shift',
			holdMode: true,
			showToggleButton: 'active',
			toggleButtonPos: 'bottom-right'
		}
	},
	compilerOptions: { experimental: { async: true } }
};

export default config;

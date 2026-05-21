import { navTree } from '$lib/server/content';
import { origin } from '$lib/server/origin';

export const prerender = true;

export function load() {
	return { nav: navTree, origin };
}

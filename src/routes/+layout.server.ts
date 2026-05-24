import { nav } from '$lib/server/content/pages';
import { origin } from '$lib/server/origin';

export const prerender = true;

export function load() {
	return { nav, origin };
}

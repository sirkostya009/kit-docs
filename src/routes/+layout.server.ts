import { nav } from '$lib/server/content';
import { origin } from '$lib/server/origin';

export const prerender = true;

export function load() {
	return { nav, origin };
}

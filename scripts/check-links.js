// build-time broken link checker. invoked from `svelte.config.js` via an adapter
// wrapper, so it runs as the final step of `vite build` and aborts the build on
// any failure. exported as a function; can also be run standalone for debugging:
//
//     node scripts/check-links.js
//
// not imported from src/, so it never enters any bundle.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} dir */
function walk(dir) {
	/** @type {string[]} */
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) out.push(...walk(full));
		else out.push(full);
	}
	return out;
}

const HREF_RE = /<a\s[^>]*?\bhref="([^"]+)"/gi;
const ID_RE = /\s(?:id|name)="([^"]+)"/gi;

/**
 * @param {string} path
 * @returns {{ ids: Set<string>, links: { href: string, line: number }[] }}
 */
function parseHtml(path) {
	const html = readFileSync(path, 'utf8');
	const ids = new Set();
	for (const m of html.matchAll(ID_RE)) ids.add(m[1]);
	/** @type {{ href: string, line: number }[]} */
	const links = [];
	for (const m of html.matchAll(HREF_RE)) {
		const before = html.slice(0, m.index ?? 0);
		const line = (before.match(/\n/g)?.length ?? 0) + 1;
		links.push({ href: m[1], line });
	}
	return { ids, links };
}

/**
 * resolve an `<a href>` against the file it lives in.
 * returns null for external/non-checkable targets.
 *
 * @param {string} href
 * @param {string} fromFile  absolute path of the html containing the link
 * @param {string} buildDir
 */
function resolveHref(href, fromFile, buildDir) {
	if (!href) return null;
	if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null; // http:, https:, mailto:, tel:, data:
	if (href.startsWith('//')) return null; // protocol-relative external
	if (href.startsWith('#')) return { file: fromFile, hash: decodeURIComponent(href.slice(1)) };

	const qIdx = href.search(/[?#]/);
	const pathPart = qIdx === -1 ? href : href.slice(0, qIdx);
	const hashIdx = href.indexOf('#');
	const hash = hashIdx === -1 ? '' : decodeURIComponent(href.slice(hashIdx + 1));

	let target;
	if (pathPart === '') target = fromFile;
	else if (pathPart.startsWith('/')) target = join(buildDir, decodeURIComponent(pathPart));
	else target = resolve(dirname(fromFile), decodeURIComponent(pathPart));

	return { file: target, hash };
}

/**
 * @param {string} target
 * @param {Map<string, unknown>} files
 */
function findFile(target, files) {
	if (files.has(target)) return target;
	if (target.endsWith('/')) {
		const idx = target + 'index.html';
		if (files.has(idx)) return idx;
	}
	const alts = [target + '.html', target + '/index.html', target + '/'];
	for (const a of alts) if (files.has(a)) return a;
	return null;
}

/**
 * walk `buildDir`, validate every internal `<a href>`. returns the list of
 * problems (empty on success). caller decides how to report.
 *
 * @param {string} buildDir  absolute path to the prerendered output
 * @returns {{ errors: string[], htmlCount: number }}
 */
export function checkLinks(buildDir) {
	const all = walk(buildDir);
	const htmlFiles = all.filter((p) => p.endsWith('.html'));

	/** @type {Map<string, { ids: Set<string>, links: { href: string, line: number }[] } | null>} */
	const files = new Map();
	for (const p of all) files.set(p, p.endsWith('.html') ? parseHtml(p) : null);

	/** @type {string[]} */
	const errors = [];

	for (const path of htmlFiles) {
		const info = /** @type {{ ids: Set<string>, links: { href: string, line: number }[] }} */ (
			files.get(path)
		);
		for (const { href, line } of info.links) {
			const resolved = resolveHref(href, path, buildDir);
			if (!resolved) continue;

			const found = findFile(resolved.file, files);
			if (!found) {
				errors.push(`${relative(process.cwd(), path)}:${line}  →  ${href}  (target missing)`);
				continue;
			}
			if (!resolved.hash) continue;
			const targetInfo = files.get(found);
			if (!targetInfo) continue;
			if (!targetInfo.ids.has(resolved.hash)) {
				errors.push(
					`${relative(process.cwd(), path)}:${line}  →  ${href}  (#${resolved.hash} not in target)`,
				);
			}
		}
	}

	return { errors, htmlCount: htmlFiles.length };
}

// CLI entry: `node scripts/check-links.js [buildDir]`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const buildDir = resolve(process.cwd(), process.argv[2] ?? 'build');
	const { errors, htmlCount } = checkLinks(buildDir);
	if (errors.length) {
		console.error(`\n✗ ${errors.length} broken link${errors.length === 1 ? '' : 's'}:\n`);
		for (const e of errors) console.error('  ' + e);
		process.exit(1);
	}
	console.log(`✓ link check: ${htmlCount} html files, no broken links`);
}

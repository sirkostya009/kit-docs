// build-time frontmatter schema validator. invoked from `vite.config.ts` as a
// vite plugin (buildStart) so the build aborts before prerender on any failure.
// also runnable standalone for debugging:
//
//     node scripts/check-frontmatter.js [docsDir]
//
// not imported from src/, so it never enters any bundle. handrolled YAML-subset
// parser — supports scalars (string/bool), block sequences (`- item`), and flow
// sequences (`[a, b]`). that covers the documented schema in docs/20_frontmatter.md.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} dir @returns {string[]} */
function walk(dir) {
	/** @type {string[]} */
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) out.push(...walk(full));
		else if (full.endsWith('.md')) out.push(full);
	}
	return out;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * @typedef {{ type: 'string', value: string, line: number }
 *         | { type: 'boolean', value: boolean, line: number }
 *         | { type: 'array', value: string[], line: number }
 *         | { type: 'unknown', value: string, line: number }} Field
 */

/**
 * parse the `---...---` block at the top of a markdown file into a field map.
 * line numbers are 1-based, relative to the file.
 *
 * @param {string} raw
 * @returns {{ fields: Record<string, Field>, parseErrors: { line: number, message: string }[] } | null}
 */
function parseFrontmatter(raw) {
	const m = raw.match(FENCE);
	if (!m) return null;
	const body = m[1];
	// the `---` opener occupies line 1, so the body starts at line 2.
	const bodyStartLine = 2;

	/** @type {Record<string, Field>} */
	const fields = {};
	/** @type {{ line: number, message: string }[]} */
	const parseErrors = [];

	const lines = body.split(/\r?\n/);
	let i = 0;
	while (i < lines.length) {
		const lineNo = bodyStartLine + i;
		const line = lines[i];
		if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
			i++;
			continue;
		}
		const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
		if (!kv) {
			parseErrors.push({ line: lineNo, message: `unparseable line: ${line.trim()}` });
			i++;
			continue;
		}
		const key = kv[1];
		const rest = kv[2].trim();

		if (rest === '') {
			// block sequence on following lines, or empty value
			/** @type {string[]} */
			const items = [];
			let j = i + 1;
			while (j < lines.length) {
				const itemMatch = lines[j].match(/^\s+-\s+(.*)$/);
				if (!itemMatch) break;
				items.push(stripQuotes(itemMatch[1].trim()));
				j++;
			}
			if (items.length > 0) {
				fields[key] = { type: 'array', value: items, line: lineNo };
				i = j;
				continue;
			}
			fields[key] = { type: 'string', value: '', line: lineNo };
			i++;
			continue;
		}

		if (rest === 'true' || rest === 'false') {
			fields[key] = { type: 'boolean', value: rest === 'true', line: lineNo };
			i++;
			continue;
		}

		const flow = rest.match(/^\[(.*)\]$/);
		if (flow) {
			const inner = flow[1].trim();
			const items = inner === '' ? [] : inner.split(',').map((s) => stripQuotes(s.trim()));
			fields[key] = { type: 'array', value: items, line: lineNo };
			i++;
			continue;
		}

		fields[key] = { type: 'string', value: stripQuotes(rest), line: lineNo };
		i++;
	}

	return { fields, parseErrors };
}

/** @param {string} s */
function stripQuotes(s) {
	if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
		return s.slice(1, -1);
	}
	return s;
}

const ISO_8601 =
	/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * @typedef {{ key: string, required?: boolean, type: 'string' | 'boolean' | 'array',
 *             nonEmpty?: boolean, validate?: (v: string) => string | null }} Rule
 */

/** @type {Rule[]} */
const SCHEMA = [
	{ key: 'title', required: true, type: 'string', nonEmpty: true },
	{ key: 'description', required: true, type: 'string', nonEmpty: true },
	{ key: 'draft', type: 'boolean' },
	{ key: 'aliases', type: 'array' },
	{ key: 'lang', type: 'string', nonEmpty: true },
	{
		key: 'lastModified',
		type: 'string',
		nonEmpty: true,
		validate: (v) => (ISO_8601.test(v) ? null : 'expected ISO 8601 timestamp'),
	},
];

/**
 * @param {Record<string, Field>} fields
 * @param {string} fileLabel  prefix for error messages, e.g. `docs/foo.md`
 * @returns {string[]}
 */
function validate(fields, fileLabel) {
	/** @type {string[]} */
	const errors = [];
	for (const rule of SCHEMA) {
		const field = fields[rule.key];
		if (!field) {
			if (rule.required) errors.push(`${fileLabel}:1  →  ${rule.key}  (missing required field)`);
			continue;
		}
		if (field.type !== rule.type) {
			errors.push(
				`${fileLabel}:${field.line}  →  ${rule.key}  (expected ${rule.type}, got ${field.type})`,
			);
			continue;
		}
		if (rule.nonEmpty && field.type === 'string' && field.value === '') {
			errors.push(`${fileLabel}:${field.line}  →  ${rule.key}  (must not be empty)`);
			continue;
		}
		if (rule.validate && field.type === 'string') {
			const msg = rule.validate(field.value);
			if (msg) errors.push(`${fileLabel}:${field.line}  →  ${rule.key}  (${msg})`);
		}
		if (rule.type === 'array' && field.type === 'array') {
			for (const item of field.value) {
				if (typeof item !== 'string' || item === '') {
					errors.push(
						`${fileLabel}:${field.line}  →  ${rule.key}  (array items must be non-empty strings)`,
					);
					break;
				}
			}
		}
	}
	return errors;
}

/**
 * walk `docsDir`, validate frontmatter of every `.md` file.
 *
 * @param {string} docsDir  absolute path to the docs source directory
 * @returns {{ errors: string[], count: number }}
 */
export function checkFrontmatter(docsDir) {
	const files = walk(docsDir);
	/** @type {string[]} */
	const errors = [];
	for (const file of files) {
		const raw = readFileSync(file, 'utf8');
		const fileLabel = relative(process.cwd(), file);
		const parsed = parseFrontmatter(raw);
		if (!parsed) {
			errors.push(`${fileLabel}:1  →  (missing frontmatter block)`);
			continue;
		}
		for (const pe of parsed.parseErrors) {
			errors.push(`${fileLabel}:${pe.line}  →  ${pe.message}`);
		}
		errors.push(...validate(parsed.fields, fileLabel));
	}
	return { errors, count: files.length };
}

// CLI entry: `node scripts/check-frontmatter.js [docsDir]`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const docsDir = resolve(process.cwd(), process.argv[2] ?? 'docs');
	const { errors, count } = checkFrontmatter(docsDir);
	if (errors.length) {
		console.error(`\n✗ ${errors.length} frontmatter error${errors.length === 1 ? '' : 's'}:\n`);
		for (const e of errors) console.error('  ' + e);
		process.exit(1);
	}
	console.log(`✓ frontmatter check: ${count} files, no schema errors`);
}

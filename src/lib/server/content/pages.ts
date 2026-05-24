import matter from 'gray-matter';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { entries, readRaw, type Entry } from './entries';
import { extractHeadings, type Heading } from './headings';
import processor from './processor';

export type Page = {
	html: string;
	metadata: Record<string, string>;
	raw: string;
	headings: Heading[];
};

async function loadPage(entry: Entry): Promise<Page> {
	const raw = await readRaw(entry);
	const { data: metadata, content } = matter(raw);
	const html = String(await processor.process(content));
	return {
		html,
		metadata: metadata as Record<string, string>,
		raw,
		headings: extractHeadings(content),
	};
}

export const pages = new Map<string, Page>(
	await Promise.all(entries.map(async (e) => [e.slug, await loadPage(e)] as const)),
);

function gitLastModified(relPath: string): string | null {
	try {
		const path = resolve(process.cwd(), 'docs', relPath);
		const out = execSync(`git log -1 --format=%cI -- "${path}"`, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
		return out || null;
	} catch {
		return null;
	}
}

export const lastModified = new Map<string, string | null>(
	entries.map((e) => [e.slug, gitLastModified(e.path)]),
);

export const nav: Record<string, string> = Object.fromEntries(
	entries.entries().map(([, { slug }]) => [slug, pages.get(slug)?.metadata.title ?? slug]),
);

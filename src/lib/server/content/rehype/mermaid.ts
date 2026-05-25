import { createMermaidRenderer, type MermaidRenderer } from 'mermaid-isomorphic';
import { hasClass, textOf, type HastElement, type HastNode, type HastRaw } from './utils';

let _render: MermaidRenderer | null = null;
const renderer = () => (_render ??= createMermaidRenderer());

// Mermaid bakes its default-theme palette into both the inline <style> block
// and per-element fill/stroke attributes of each SVG. Swap those literals for
// our app.css custom properties so the diagram tracks light/dark automatically.
const MERMAID_COLOR_MAP: Record<string, string> = {
	'#ECECFF': 'var(--surface-raised)',
	'#9370DB': 'var(--primary)',
	'#000': 'var(--foreground)',
	'#000000': 'var(--foreground)',
	'#333': 'var(--foreground)',
	'#333333': 'var(--foreground)',
	'#666': 'var(--foreground-muted)',
	'#999': 'var(--foreground-subtle)',
	'#AAA': 'var(--foreground-subtle)',
	'#F4F4F4': 'var(--surface-overlay)',
	'#FFF5AD': 'var(--primary-subtle)',
	'#FFFFDE': 'var(--primary-subtle)',
	'#AAAA33': 'var(--border)',
	'#EAEAEA': 'var(--border-subtle)',
	'#131300': 'var(--foreground)',
};
const HEX = /#[0-9A-Fa-f]{3,6}\b/g;

function lookup(hex: string) {
	const upper = hex.toUpperCase();
	// Normalize 3-digit → 6-digit so map covers both cases.
	const expanded =
		upper.length === 4
			? `#${upper[1]}${upper[1]}${upper[2]}${upper[2]}${upper[3]}${upper[3]}`
			: upper;
	return MERMAID_COLOR_MAP[upper] ?? MERMAID_COLOR_MAP[expanded] ?? hex;
}

// Mermaid sometimes emits CSS named colors (notably `fill:black` on sequence-
// diagram labels) instead of hex. Catch those too.
const NAMED_COLOR_MAP: Record<string, string> = {
	black: 'var(--foreground)',
	white: 'var(--surface)',
};

function recolor(svg: string): string {
	svg = svg.replace(HEX, lookup);
	svg = svg.replace(
		/(fill|stroke)(\s*[:=]\s*"?)(black|white)("?)/gi,
		(_m, prop, sep, color, end) => `${prop}${sep}${NAMED_COLOR_MAP[color.toLowerCase()]}${end}`,
	);
	return svg;
}

interface Slot {
	siblings: HastNode[];
	index: number;
	source: string;
	caption: string | null;
}

function escapeHtml(s: string): string {
	return s.replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
	);
}

// A leading `%% …` Mermaid comment line is consumed as the figure caption
// rather than being passed through to Mermaid (which would treat it as a
// comment and drop it anyway).
function extractCaption(source: string): { caption: string | null; body: string } {
	const m = source.match(/^[ \t]*%%[ \t]?(.*)\r?\n/);
	if (!m) return { caption: null, body: source };
	const caption = m[1].trim();
	if (!caption) return { caption: null, body: source };
	return { caption, body: source.slice(m[0].length) };
}

function collect(children: HastNode[], slots: Slot[]): void {
	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		if (node.type !== 'element') continue;
		const el = node as HastElement;

		if (el.tagName === 'pre' && el.children.length === 1) {
			const code = el.children[0];
			if (
				code?.type === 'element' &&
				(code as HastElement).tagName === 'code' &&
				hasClass((code as HastElement).properties, 'language-mermaid')
			) {
				const { caption, body } = extractCaption(textOf(code as HastElement));
				slots.push({ siblings: children, index: i, source: body, caption });
				continue;
			}
		}

		if (el.children) collect(el.children, slots);
	}
}

function wrap(svg: string, caption: string | null): HastRaw {
	const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';
	return {
		type: 'raw',
		value: `<figure class="mermaid-diagram">${recolor(svg)}${figcaption}</figure>`,
	};
}

function errorNode(message: string, caption: string | null): HastRaw {
	const safe = escapeHtml(message);
	const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '';
	return {
		type: 'raw',
		value: `<figure class="mermaid-diagram mermaid-error"><pre>${safe}</pre>${figcaption}</figure>`,
	};
}

export default function rehypeMermaid() {
	return async (tree: unknown) => {
		const root = tree as { children: HastNode[] };
		const slots: Slot[] = [];
		collect(root.children, slots);
		if (slots.length === 0) return;

		const results = await renderer()(slots.map((s) => s.source));
		for (let i = 0; i < slots.length; i++) {
			const r = results[i];
			const caption = slots[i].caption;
			slots[i].siblings[slots[i].index] =
				r.status === 'fulfilled'
					? wrap(r.value.svg, caption)
					: errorNode(String(r.reason), caption);
		}
	};
}

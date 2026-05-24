import temml from 'temml';

interface HastText {
	type: 'text';
	value: string;
}
interface HastRaw {
	type: 'raw';
	value: string;
}
interface HastElement {
	type: 'element';
	tagName: string;
	properties?: Record<string, unknown>;
	children: HastNode[];
}
type HastNode = HastText | HastRaw | HastElement | { type: string; children?: HastNode[] };

function hasClass(props: Record<string, unknown> | undefined, cls: string): boolean {
	if (!props) return false;
	const v = props.className;
	if (Array.isArray(v)) return v.includes(cls);
	if (typeof v === 'string') return v.split(/\s+/).includes(cls);
	return false;
}

function textOf(el: HastElement): string {
	let s = '';
	for (const c of el.children) {
		if (c.type === 'text') s += (c as HastText).value;
	}
	return s;
}

function render(tex: string, displayMode: boolean): HastRaw {
	const html = temml.renderToString(tex, {
		displayMode,
		throwOnError: false,
		errorColor: '#cc0000',
	});
	// Strip class attributes — temml emits them for optional Temml-Local.css
	// fine-tuning (italic correction, accent positioning). We don't ship that
	// CSS, so the classes are dead bytes. Inline style/attribute fallbacks on
	// the same elements keep layout correct.
	return { type: 'raw', value: html.replace(/ class="[^"]*"/g, '') };
}

function transform(children: HastNode[]): HastNode[] {
	const out: HastNode[] = [];
	for (const node of children) {
		if (node.type === 'element') {
			const el = node as HastElement;
			const firstChild = el.children[0];

			// display: <pre><code class="math-display">...</code></pre>
			if (
				el.tagName === 'pre' &&
				el.children.length === 1 &&
				firstChild?.type === 'element' &&
				(firstChild as HastElement).tagName === 'code' &&
				hasClass((firstChild as HastElement).properties, 'math-display')
			) {
				out.push(render(textOf(firstChild as HastElement), true));
				continue;
			}

			// inline: <code class="math-inline">...</code>
			if (el.tagName === 'code' && hasClass(el.properties, 'math-inline')) {
				out.push(render(textOf(el), false));
				continue;
			}

			if (el.children) el.children = transform(el.children);
		}
		out.push(node);
	}
	return out;
}

export default function rehypeMath() {
	return (tree: unknown) => {
		const root = tree as { children: HastNode[] };
		root.children = transform(root.children);
	};
}

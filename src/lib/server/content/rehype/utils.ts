export interface HastText {
	type: 'text';
	value: string;
}

export interface HastRaw {
	type: 'raw';
	value: string;
}

export interface HastElement {
	type: 'element';
	tagName: string;
	properties?: Record<string, unknown>;
	children: HastNode[];
}

export type HastNode = HastText | HastRaw | HastElement | { type: string; children?: HastNode[] };

export const isElement = (n: HastNode): n is HastElement => n.type === 'element';

export function hasClass(props: Record<string, unknown> | undefined, cls: string): boolean {
	if (!props) return false;
	const v = props.className;
	if (Array.isArray(v)) return v.includes(cls);
	if (typeof v === 'string') return v.split(/\s+/).includes(cls);
	return false;
}

export function textOf(el: HastElement): string {
	let s = '';
	for (const c of el.children) {
		if (c.type === 'text') s += (c as HastText).value;
	}
	return s;
}

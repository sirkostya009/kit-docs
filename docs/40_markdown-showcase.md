---
title: Markdown Showcase
description: A stress test of markdown rendering with complex nested structures.
---

# Markdown Showcase

A stress test of every markdown feature worth caring about.[^1]

[^1]: Some features require remark plugins — footnotes use `remark-footnotes@2`.

## Tables

### Basic

| name    | type      | default | required |
| ------- | --------- | ------- | -------- |
| `slug`  | `string`  | —       | yes      |
| `title` | `string`  | —       | no       |
| `draft` | `boolean` | `false` | no       |
| `order` | `number`  | `0`     | no       |

### Wide with alignment

| left-aligned         | center-aligned  |  right-aligned |
| :------------------- | :-------------: | -------------: |
| `adapter-static`     |   prerendered   |      0 ms TTFB |
| `adapter-node`       |     hybrid      |    ~30 ms TTFB |
| `adapter-cloudflare` |   edge + SSR    |     ~5 ms TTFB |
| `adapter-vercel`     | ISR + streaming | ~10–40 ms TTFB |

### Nested content in cells

| feature        | notes                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| links in cells | [SvelteKit docs](https://kit.svelte.dev) render correctly                                |
| long prose     | Cells wrap naturally; you don't need to worry about overflow on narrower viewport widths |
| **bold**       | and _italic_ and ~~strikethrough~~ all work inside table cells                           |

---

## Code Blocks

### TypeScript

```typescript
type PageMeta = {
	title?: string;
	description?: string;
	draft?: boolean;
};

async function getPage(slug: string): Promise<{
	component: Component;
	metadata: PageMeta;
	raw: string;
	lastModified: string | null;
	publishedAt: string | null;
} | null> {
	const key = `../../docs/${slug}.md`;
	if (!(key in modules)) return null;
	const mod = await modules[key]();
	return { component: mod.default, metadata: mod.metadata ?? {}, raw: '' };
}
```

### Shell with multiple commands

```bash
# install deps
pnpm install

# dev server
unset GTK_IM_MODULE_FILE && pnpm dev

# production build
pnpm build && pnpm preview
```

### Diff

```diff
- export function getSlugs() {
-   return Object.keys(modules).map(...);
- }
+ export const slugs = Object.keys(modules)
+   .map((p) => p.replace('../../docs/', '').replace(/\.md$/, ''))
+   .map((slug) => ({ slug }));
```

---

## Blockquotes

> This is a simple blockquote.

> **Note:** Blockquotes can contain **bold**, _italic_, `code`, and even other block-level elements.
>
> Like a second paragraph.
>
> > And a nested blockquote inside it.
> >
> > > Nested three levels deep. This is where most renderers start to sweat.

---

## Lists

### Ordered with nesting

1. Install dependencies
   1. Make sure you have Node 20+
   2. Install pnpm globally: `npm i -g pnpm`
   3. Run `pnpm install`
2. Configure your adapter
   - `adapter-static` for fully static output
   - `adapter-node` for a Node server
3. Write your docs in `docs/*.md`
4. Build
   ```bash
   pnpm build
   ```

### Unordered with deep nesting

- Rendering pipeline
  - Vite transforms `.md` via mdsvex
    - mdsvex parses frontmatter
    - mdsvex compiles markdown to a Svelte component
      - Svelte compiles the component to JS
        - SvelteKit prerenderers the JS to HTML
  - Tailwind Typography styles the output

### Task list

- [x] markdown pages prerendered to HTML
- [x] raw `.md` source served at `<slug>.md`
- [x] syntax highlighting via mdsvex
- [x] dark mode
- [ ] search
- [ ] versioned docs
- [ ] i18n

---

## Inline Formatting

Here is **bold**, _italic_, ~~strikethrough~~, `inline code`, and a [link](https://svelte.dev).
Hard line break above (two trailing spaces).

Combining them: **_bold italic_**, **~~bold strikethrough~~**, `code` inside **bold context**.

---

## Headings at Every Level

## h2 heading

### h3 heading

#### h4 heading

##### h5 heading

###### h6 heading

---

## Horizontal Rules

Three ways to write one — they all look the same:

---

---

---

---

## Images

![Svelte logo](https://svelte.dev/favicon.png)

With a title attribute:

![Svelte logo](https://svelte.dev/favicon.png 'The Svelte logo')

---

## Footnotes

Footnotes render as superscript links.[^1] Named footnotes work too.[^note]

[^1]: First footnote — plain text.

[^note]: A named footnote. Can contain `code` and **formatting**.

---

## Admonitions

:::note
Default informational call-out. Works with **markdown** inside.
:::

:::tip
Use tips for forward-looking advice.
:::

:::info[Heads-up]
Override the default heading by putting the label in square brackets after the directive name.
:::

:::warning
Heading for footguns the reader is about to walk into.
:::

:::caution
For risky operations.
:::

:::danger
For irreversible / destructive actions.
:::

---

## Tabs

Switch between equivalent snippets. Tabs that share a `groupId` sync their
selection (persisted in `localStorage`).

::::tabs{groupId="lang"}

::tab[curl]

```sh
curl -X POST https://api.example.com/v1/items \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"thing"}'
```

::tab[js]

```js
await fetch('https://api.example.com/v1/items', {
	method: 'POST',
	headers: { Authorization: `Bearer ${token}` },
	body: JSON.stringify({ name: 'thing' }),
});
```

::tab[python]

```python
requests.post(
    "https://api.example.com/v1/items",
    headers={"Authorization": f"Bearer {token}"},
    json={"name": "thing"},
)
```

::::

Tabs combine with per-block `title="..."` — the title bar tucks under the
selected tab so the active tab visually "opens" into its file:

::::tabs{groupId="lang"}

::tab[curl]

```sh title="request.sh"
curl https://api.example.com/v1/items/42
```

::tab[js]

```js title="request.js"
const res = await fetch('https://api.example.com/v1/items/42');
```

::tab[python]

```python title="request.py"
requests.get("https://api.example.com/v1/items/42")
```

::::

---

## Code annotations

### Line highlight via meta

```ts {2-3}
function noop() {}
function add(a: number, b: number) {
	return a + b;
}
function done() {}
```

### Line highlight via magic comment

```ts
function noop() {}
function add(a: number, b: number) {
	return a + b; // [!code highlight]
}
```

### Diff notation

```ts
function noop() {}
function removed() {} // [!code --]
function added() {} // [!code ++]
```

### Title bar

```ts title="src/lib/server/content.ts"
import { unified } from 'unified';

const processor = unified().use(remarkParse).use(remarkGfm);
```

### Line numbers

```ts {showLineNumbers}
function noop() {}
function add(a: number, b: number) {
	return a + b;
}
function done() {}
```

### Line numbers with title and highlight

```ts {2-3} title="src/lib/math.ts" {showLineNumbers}
function noop() {}
function add(a: number, b: number) {
	return a + b;
}
function done() {}
```

### Inline highlighting

The runtime function `fetch(url){:js}` returns a Promise, while `let mut x: i32 = 0;{:rust}` declares a mutable binding. Languages render with the same dual-theme tokens as fenced blocks.

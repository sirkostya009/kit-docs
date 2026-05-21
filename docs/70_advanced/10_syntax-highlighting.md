---
title: Syntax highlighting
description: Configure Shiki themes, languages, and code-block decorators.
---

# Syntax highlighting

Code blocks are rendered by [Shiki](https://shiki.style) via the `@shikijs/rehype` plugin. The configuration lives in `src/lib/server/content.ts`.

```typescript
.use(rehypeShiki, {
  themes: { light: 'github-light', dark: 'github-dark' },
  defaultColor: false,
  defaultLanguage: 'text',
  fallbackLanguage: 'text'
})
```

Setting `defaultColor: false` emits both themes inline as CSS variables (`--shiki-light`, `--shiki-dark`). The `.dark` class on `<html>` toggles between them — no runtime swap, no flash.

## Changing the theme

Pick any [Shiki theme](https://shiki.style/themes) — they're loaded on demand:

```typescript
themes: {
  light: 'catppuccin-latte',
  dark: 'catppuccin-mocha'
}
```

To use a custom theme, pass an object instead of a string. Shiki accepts the same JSON format as VS Code themes:

```typescript
import myTheme from './my-theme.json';

themes: {
  light: myTheme,
  dark: 'github-dark'
}
```

## Adding languages

Shiki ships with grammar files for ~200 languages — all auto-loaded the first time they appear in a code fence. If you author content in an exotic language, you can preload it to avoid the first-paint cost:

```typescript
.use(rehypeShiki, {
  langs: ['typescript', 'svelte', 'gleam', 'roc'],
  themes: { /* ... */ }
})
```

### Aliases

Common aliases are recognized: `ts` → `typescript`, `sh` → `bash`, `yml` → `yaml`. The full list is in the [Shiki language registry](https://shiki.style/languages).

For ad-hoc aliases, register them inline:

```typescript
langAlias: {
  shell: 'bash',
  cfg: 'ini'
}
```

## Code block decorators

Append decorators after the language tag:

````markdown
```ts {2-4} title="example.ts" {showLineNumbers}
const a = 1;
const b = 2;
const c = 3;
const d = 4;
```
````

| Decorator         | Effect                              |
| ----------------- | ----------------------------------- |
| `{2-4}`           | Highlight a line range              |
| `{2,4,6}`         | Highlight discrete lines            |
| `title="..."`     | Render a title bar above the block  |
| `showLineNumbers` | Show 1-indexed line numbers         |
| `noCopy`          | Hide the copy button (when enabled) |

> **Note:** Decorators rely on Shiki transformers. The `transformerNotationHighlight`, `transformerNotationDiff`, and `transformerMetaHighlight` transformers are commonly used together — adding them is a one-line change in `content.ts` but the matching CSS is not in the starter yet.

## Inline highlighting

Wrap inline code with a language using the `{:lang}` annotation:

```markdown
The function `fetch(url) {:js}` returns a Promise.
```

This is a Shiki feature; enable it by passing `inline: 'tailing-curly-colon'` to the plugin.

## Copy button

A copy-to-clipboard button on every code block is not in the starter, but the markup is friendly to a tiny enhancement script:

```svelte
<script>
	import { onMount } from 'svelte';

	onMount(() => {
		for (const pre of document.querySelectorAll('pre.shiki')) {
			const btn = document.createElement('button');
			btn.textContent = 'copy';
			btn.onclick = () => navigator.clipboard.writeText(pre.innerText);
			pre.prepend(btn);
		}
	});
</script>
```

Drop that into `[...slug].html/+page.svelte` and style with the existing surface tokens.

## Performance

Shiki loads themes and grammars eagerly during the build, then the bundle ships zero JS for highlighting — every code block is plain HTML with inline styles. Adding more languages or themes increases build time but not page weight.

For very large doc sets, switch to [`expressive-code`](https://expressive-code.com) (also Shiki-based, with bundled CSS for line numbers, titles, and the copy button).

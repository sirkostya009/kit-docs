---
title: Syntax highlighting
description: Configure Shiki themes, languages, and code-block decorators.
---

# Syntax highlighting

Code blocks are rendered by [Shiki](https://shiki.style) via the `@shikijs/rehype` plugin. The configuration lives in `src/lib/server/content/processor.ts`.

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

## Languages

Shiki ships with grammar files for ~200 languages, all loaded on demand the first time they appear in a code fence. Common aliases work out of the box: `ts` → `typescript`, `sh` → `bash`, `yml` → `yaml`. The full list is in the [Shiki language registry](https://shiki.style/languages).

Unknown languages fall back to plain text — `defaultLanguage` and `fallbackLanguage` are both set to `'text'` so an unrecognized fence never throws.

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

| Decorator         | Effect                                       |
| ----------------- | -------------------------------------------- |
| `{2-4}`           | Highlight a line range                       |
| `{2,4,6}`         | Highlight discrete lines                     |
| `title="..."`     | Render a title bar above the block           |
| `showLineNumbers` | Show 1-indexed line numbers in a left gutter |

Highlights and diff annotations come from `transformerNotationHighlight`, `transformerNotationDiff`, and `transformerMetaHighlight`. Title bars, line numbers, and the language badge come from custom transformers in `src/lib/server/content/shiki/` (`transformerTitle`, `transformerLineNumbers`, `transformerLang`).

## Inline highlighting

Wrap inline code with a language using the `{:lang}` annotation:

```markdown
The function `fetch(url) {:js}` returns a Promise.
```

Renders as: `fetch(url) {:js}` — tokens get the same dual-theme coloring as fenced blocks. This is enabled in `processor.ts` via `inline: 'tailing-curly-colon'` on the rehype plugin.

## Code block chrome

Every rendered code block is enhanced at runtime in `[...slug].html/+page.svelte`:

- **language badge** — `data-lang` attribute is set by `transformerLang`; CSS renders the language in the top-right corner. Hidden on hover so the action buttons can take the space.
- **copy button** — clipboard icon revealed on hover, swaps to a checkmark for 1.5s on success.
- **wrap toggle** — toggles `data-wrap` on the `<pre>`; CSS switches `white-space` to `pre-wrap` so long lines fold instead of scrolling.

All three live next to each other in the top-right. None of them require frontmatter or per-block opt-in.

## Performance

Shiki loads themes and grammars eagerly during the build, then the bundle ships zero JS for highlighting — every code block is plain HTML with inline styles. Adding more languages or themes increases build time but not page weight.

For very large doc sets, switch to [`expressive-code`](https://expressive-code.com) — also Shiki-based, with frames, collapsible sections, and twoslash baked in.

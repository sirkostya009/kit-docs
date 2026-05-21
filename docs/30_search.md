---
title: Search
description: Client-side full-text search powered by a prerendered index.
---

# Search

Press <kbd>⌘ K</kbd> (or <kbd>Ctrl K</kbd> on Windows / Linux) anywhere in the docs to open the search modal. The modal is mounted globally from `+layout.svelte`.

## How it works

At build time, `src/routes/search-index.json/+server.ts` walks every markdown source, strips frontmatter and code fences, and emits a single JSON document under `/search-index.json`. The browser fetches that file on first focus and runs a fuzzy match in memory — no server round-trip, no third-party dependency.

```typescript
const entries = await fetch('/search-index.json').then((r) => r.json());
```

Each entry has the shape:

```typescript
{
	slug: string; // e.g. "guides/installation"
	title: string; // page title from frontmatter
	description: string; // from frontmatter
	headings: Array<{
		// h2 + h3 only
		id: string; //   slugified anchor
		text: string; //   raw heading text
	}>;
	content: string; // body text, ≤ 8000 chars
}
```

## Index size

The index is shipped as one prerendered JSON file. For the default content set it weighs ~6 KB gzipped. Three knobs control growth:

| Knob             | Where                                  | Default |
| ---------------- | -------------------------------------- | ------- |
| Per-page content | `text.slice(0, 8000)` in `+server.ts`  | 8000 ch |
| Headings depth   | `h2[id], h3[id]` selector in scrollspy | h2 + h3 |
| Excluded pages   | `draft: true` in frontmatter           | empty   |

If your site grows past a few hundred pages, swap the in-memory match for a prebuilt index — [`flexsearch`](https://github.com/nextapps-de/flexsearch) or [`minisearch`](https://github.com/lucaong/minisearch) both work without a server. Plug the index into `SearchModal.svelte` and keep the same `/search-index.json` endpoint.

## Keyboard shortcuts

| Key                         | Action                           |
| --------------------------- | -------------------------------- |
| <kbd>⌘ K</kbd>              | Open the modal                   |
| <kbd>Ctrl K</kbd>           | Open the modal (Windows / Linux) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Move selection                   |
| <kbd>Enter</kbd>            | Open the highlighted result      |
| <kbd>Esc</kbd>              | Close the modal                  |

## Ranking

The modal scores matches in this order:

1. Exact title match.
2. Title substring match.
3. Heading match (h2 over h3).
4. Description match.
5. Body match.

Results from the same page are deduplicated to the highest-ranked match.

## Customizing

To bias results toward a particular section (for example, a "Reference" group should outrank "Blog"), extend the index payload with a `weight` field and consume it in the scoring step:

```typescript
return {
	...entry,
	weight: slug.startsWith('reference/') ? 2 : 1,
};
```

> **Tip:** The search modal lives in `src/lib/SearchModal.svelte`. It's a single component — copy it into your own project if you fork kit-docs.

## Disabling

Remove the `<SearchModal>` mount from `+layout.svelte` and delete `src/routes/search-index.json/`. The keyboard shortcut handler is colocated in the layout `$effect` block — pull it out at the same time.

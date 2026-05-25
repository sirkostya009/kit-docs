---
title: Search
description: Client-side full-text search powered by a prebuilt MiniSearch index.
---

# Search

Press <kbd>⌘ K</kbd> (or <kbd>Ctrl K</kbd> on Windows / Linux) anywhere in the docs to open the search modal. The modal is mounted globally from `+layout.svelte`.

## How it works

At build time, `src/routes/search-index.json/+server.ts` walks every markdown source, strips frontmatter, fenced and inline code, and markdown syntax characters, then feeds each page into a [MiniSearch](https://github.com/lucaong/minisearch) index. The serialized index and the sorted list of top-level sections are emitted as a single JSON document under `/search-index.json`.

```typescript
const res = await fetch('/search-index.json');
const data = await res.json();
mini = MiniSearch.loadJS(data.index, MINI_OPTIONS);
```

Each indexed document has the shape:

```typescript
{
	id: string; // === slug
	slug: string; // e.g. "guides/installation"
	section: string; // first path segment, e.g. "guides" — '' for root pages
	title: string; // page title from frontmatter
	description: string; // from frontmatter
	headings: {
		id: string;
		text: string;
	}
	[]; // h2 + h3
	headingsText: string; // joined for full-text indexing
	content: string; // body text, ≤ 8000 chars
}
```

## Ranking

The modal calls `mini.search(query, ...)` with:

```typescript
{
	fuzzy: 0.2,
	prefix: true,
	boost: { title: 3, headingsText: 2 },
	filter: activeSection ? (r) => r.section === activeSection : undefined,
}
```

MiniSearch handles ranking — there is no manual cascade. `title` matches outweigh `headingsText`, which outweigh `description` and `content`. Prefix matching lets `"adm"` find "Admonitions"; the 20% fuzziness budget tolerates a typo or two. The top 10 hits are kept and a snippet is extracted around the first matched term.

## Index size

The index ships as one prerendered JSON file. Two knobs control growth:

| Knob             | Where                                 | Default |
| ---------------- | ------------------------------------- | ------- |
| Per-page content | `text.slice(0, 8000)` in `+server.ts` | 8000 ch |
| Headings depth   | regex `^(#{2,3})` in `headings.ts`    | h2 + h3 |

Both live in `src/routes/search-index.json/+server.ts` and `src/lib/server/content/headings.ts` respectively.

## Section filter

The pill above the input lets the user scope results to a top-level section (e.g. "guides", "advanced"). The list comes from the `sections` array in the index payload — every distinct first path segment, sorted. Root-level pages (no slash in the slug) have `section: ''` and are excluded from the pill row.

## Recent searches

The last five queries are persisted in `localStorage` under the key `kit-docs:recent-searches` and shown when the modal opens with an empty query. The "Clear" button wipes the key.

## Keyboard shortcuts

| Key                         | Action                           |
| --------------------------- | -------------------------------- |
| <kbd>⌘ K</kbd>              | Open the modal                   |
| <kbd>Ctrl K</kbd>           | Open the modal (Windows / Linux) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Move selection                   |
| <kbd>Enter</kbd>            | Open the highlighted result      |
| <kbd>Esc</kbd>              | Close the modal                  |

> **Tip:** The search modal lives in `src/lib/SearchModal.svelte`. It's a single component — copy it into your own project if you fork kit-docs.

## Disabling

Remove the `<SearchModal>` mount from `+layout.svelte` and delete `src/routes/search-index.json/`. The keyboard shortcut handler is colocated in the layout `$effect` block — pull it out at the same time.

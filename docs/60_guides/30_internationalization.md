---
title: Internationalization
description: Directory-based locale layout for translated content.
---

# Internationalization

kit-docs uses a directory-based layout for translations: drop pages into a locale subdirectory and they're served under a matching URL prefix.

> **Note:** Only the routing convention is wired today. There is no built-in locale switcher, no `<html lang>` toggle, no sidebar grouping per locale, and no `<link rel="alternate" hreflang>` emission. Treat what follows as the foundation you'd build the rest of the runtime on top of.

## Directory layout

Mirror the default locale's structure under `docs/<locale>/`:

```
docs/
  getting-started.md           → /getting-started.html        (en)
  configuration.md             → /configuration.html
  fr/
    getting-started.md         → /fr/getting-started.html
    configuration.md           → /fr/configuration.html
  ja/
    getting-started.md         → /ja/getting-started.html
```

The default locale lives at the root — no prefix. Every other locale gets its own subdirectory whose name is the locale code. Subdirectories are picked up automatically by the glob in `src/lib/server/content/entries.ts`; the slug becomes `<locale>/<page>`.

## Locale codes

Use [BCP 47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) tags. Examples:

| Tag       | Language             |
| --------- | -------------------- |
| `en`      | English (default)    |
| `fr`      | French               |
| `de`      | German               |
| `ja`      | Japanese             |
| `zh-Hans` | Simplified Chinese   |
| `pt-BR`   | Brazilian Portuguese |

## Translation workflow

1. Author the page in the default locale under `docs/`.
2. Copy the file into `docs/<locale>/` and translate in place.
3. Rebuild — locale-prefixed routes are picked up automatically.

## RTL languages

The starter layout uses logical CSS properties (`padding-inline-start`, `margin-inline-end`) throughout, so the chrome flips automatically when `dir="rtl"` is set on `<html>`. The flip itself is not automatic — you'd have to set the attribute yourself, e.g. from a `+layout.svelte` that inspects the route's locale prefix.

## What's not built in

- Locale switcher UI.
- Per-locale `<html lang>` / `dir` toggling.
- `<link rel="alternate" hreflang="…">` tags in the head.
- Sidebar grouping or filtering by locale.
- Translation-aware search (the index mixes all locales).
- Date and number formatting helpers inside markdown.
- Pluralization rules in nav labels — sidebar labels come straight from the page title.

If you need any of these, they're plain Svelte / SvelteKit additions on top of the routing convention above.

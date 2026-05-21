---
title: Internationalization
description: Translate pages into multiple languages with locale-prefixed routes.
---

# Internationalization

kit-docs ships with a directory-based i18n layout: drop translations into a locale folder and they show up under a matching URL prefix.

> **Note:** The locale switcher UI and translation-aware sidebar grouping are still in progress. The directory convention below is forward-compatible — content authored today will Just Work once the runtime catches up.

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

The default locale lives at the root — no prefix. Every other locale gets its own subdirectory whose name is the locale code.

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

## Per-page lang

Each translation should set `lang` in its frontmatter so the rendered `<html lang>` attribute is correct:

```markdown
---
title: Pour commencer
description: Comment démarrer rapidement
lang: fr
---
```

This is what screen readers and search engines pick up. See [frontmatter](/frontmatter.html) for the full field list.

## Linking between translations

Use the `alternates` frontmatter array to declare sibling translations of a page. The runtime emits `<link rel="alternate" hreflang="…">` tags so search engines can serve the right variant.

```yaml
alternates:
  - lang: en
    href: /getting-started.html
  - lang: fr
    href: /fr/getting-started.html
  - lang: ja
    href: /ja/getting-started.html
```

When a translation is missing, the locale switcher falls back to the default locale and emits a `data-fallback` attribute on the link for analytics.

## Default locale

Configure the default locale in `svelte.config.js`:

```javascript
export default {
	kit: {
		// ...
	},
	// forward-compatible config — read by the runtime once i18n lands
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'fr', 'ja'],
	},
};
```

Pages not in a locale subdirectory are treated as `defaultLocale`. Switching the default later requires renaming directories — keep the choice stable.

## Translation workflow

A typical workflow:

1. Author the page in the default locale under `docs/`.
2. Run `pnpm i18n:scaffold fr` to copy stubs into `docs/fr/` with `draft: true` set.
3. Translate the file, drop the `draft` flag, and rebuild.

> **Tip:** Translated pages are excluded from the sitemap until `draft: false`. This keeps half-finished translations out of search engines.

## RTL languages

For right-to-left locales (Arabic, Hebrew, Persian), set `direction: rtl` in the locale's frontmatter or in the global config. The starter layout uses logical CSS properties (`padding-inline-start`, `margin-inline-end`) so the chrome flips automatically.

```yaml
lang: ar
direction: rtl
```

## What's not (yet) supported

- Per-locale theming or custom fonts. Override `--font-sans` globally for now.
- Date and number formatting helpers inside markdown. Reach for a Svelte component if you need locale-aware rendering inline.
- Pluralization rules in nav labels. Sidebar labels come straight from the page title.

If you need any of the above today, drop a comment on the i18n tracking issue with your use case.

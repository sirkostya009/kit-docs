---
title: Frontmatter
description: Per-page metadata fields parsed by gray-matter.
---

# Frontmatter

Every `.md` file in `docs/` may start with a YAML frontmatter block delimited by `---`. The block is parsed by [gray-matter](https://github.com/jonschlinkert/gray-matter) and exposed to the page as `data.metadata`.

```markdown
---
title: My page
description: A short summary used for sidebar and meta tags.
---

# My page
```

## Supported fields

| Field          | Type     | Default       | Used for                                               |
| -------------- | -------- | ------------- | ------------------------------------------------------ |
| `title`        | string   | slug          | `<title>`, sidebar label, OG title                     |
| `description`  | string   | `''`          | `<meta name="description">`, OG description, hero card |
| `draft`        | boolean  | `false`       | Excludes the page from production builds               |
| `aliases`      | string[] | `[]`          | Additional slugs that redirect to the canonical URL    |
| `lang`         | string   | site default  | Sets `<html lang>` for that page                       |
| `lastModified` | string   | git timestamp | ISO 8601 — overrides the auto-detected mtime           |

> **Note:** `draft` and `aliases` are read from frontmatter today but the corresponding build steps are still landing. Pages with `draft: true` currently render normally — treat the flag as forward-compatible.

## Field details

### `title`

Used in three places: the `<title>` tag (suffixed with `· kit-docs`), the sidebar entry, and the search index. Keep it short — sidebar entries truncate around 30 characters.

```yaml
title: Authentication
```

### `description`

Surfaces in `<meta name="description">`, `og:description`, and the homepage card grid. Aim for a single sentence under 160 characters.

```yaml
description: How to issue and rotate API keys.
```

### `draft`

When `true`, the page is excluded from `slugs`, `navTree`, the search index, and the sitemap. Useful for staging unfinished pages on the default branch.

```yaml
draft: true
```

### `aliases`

A list of legacy slugs that should redirect to this page. Each alias generates a tiny prerendered HTML stub with a meta refresh and a canonical link.

```yaml
aliases:
  - old-getting-started
  - quickstart
```

### `lang`

Override the document language for a single page. Pairs with the [internationalization guide](/guides/internationalization.html) to flag translations to search engines.

```yaml
lang: fr
```

## Custom fields

Anything you put in the frontmatter is preserved on `data.metadata`. Use this to drive bespoke UI per page:

```yaml
---
title: Changelog
description: Release notes
hero: false
sidebar: hidden
---
```

In `[...slug].html/+page.svelte` you can branch on these fields:

```svelte
{#if data.metadata.hero !== false}
	<Hero title={data.metadata.title} />
{/if}
```

> **Tip:** Add custom fields under a namespace (`x-internal-id`, `x-team`) so they don't collide with future built-in keys.

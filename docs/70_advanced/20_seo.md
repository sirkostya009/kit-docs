---
title: SEO and sitemap
description: Meta tags, Open Graph cards, and the prerendered sitemap.
---

# SEO and sitemap

Every page is prerendered to static HTML, so search engines see the same content as users — no client-side hydration trick required.

## Meta tags

The page layout in `[...slug].html/+page.svelte` emits the following tags into `<svelte:head>` for every doc page:

- `<title>` — `${frontmatter.title} · kit-docs`
- `<link rel="canonical">` — the absolute URL derived from `ORIGIN`
- `<link rel="alternate" type="text/markdown">` — the raw `.md` companion
- `<meta name="description">`
- `<meta property="og:title">`, `og:description`, `og:type`, `og:url`, `og:locale`
- `<meta name="twitter:card">`, `twitter:title`, `twitter:description`
- `<meta property="article:modified_time">` and `<meta name="last-modified">` (when the file has a git history)
- A JSON-LD `<script type="application/ld+json">` block — see [structured data](#structured-data) below

The root layout adds the site name once:

```svelte
<meta property="og:site_name" content="kit-docs" />
```

Override the title suffix by editing the `title` derivation in `+page.svelte`.

## Open Graph images

There is no built-in OG image pipeline — the head section above does not emit `og:image` or `twitter:image`. If you want per-page social cards, point a build step at [`@vercel/og`](https://vercel.com/docs/og-image-generation) or [Satori](https://github.com/vercel/satori), write the output to `static/og/<slug>.png`, and add the corresponding `<meta>` tags in `+page.svelte` (1200×630 is the recommended dimension; keep files under 1 MB).

## Canonical URLs

Set the canonical hostname through `ORIGIN`:

```bash
ORIGIN=https://docs.example.com pnpm build
```

`sitemap.xml` and any `og:url` tags use this value. Without it, the build falls back to `http://localhost:5173`, which is fine for previews but not for production.

## Sitemap

`src/routes/sitemap.xml/+server.ts` enumerates every slug and emits `sitemap.xml` at the site root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://docs.example.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://docs.example.com/getting-started.html</loc>
    <priority>0.8</priority>
  </url>
  ...
</urlset>
```

The home page gets a priority of `1.0`, every other page `0.8`. Edit the loop in `+server.ts` to vary priority per group:

```typescript
const priority = path.startsWith('/reference/') ? '0.9' : '0.6';
```

### `lastmod`

Each entry includes a `<lastmod>` element derived from the file's most recent git commit timestamp (see `lastModified` in `src/lib/server/content/pages.ts`). Pages with no git history (e.g. uncommitted local edits) skip the element entirely.

Most search engines treat `lastmod` as a hint, not a guarantee.

## Structured data

`+page.svelte` already emits a JSON-LD block for every doc page via the `ldScript` derivation:

```typescript
{
	'@context': 'https://schema.org',
	'@type': 'TechArticle',
	headline: pageTitle,
	...(description && { description }),
	url: canonicalUrl,
	mainEntityOfPage: canonicalUrl,
	inLanguage: 'en',
	isPartOf: { '@type': 'WebSite', name: 'kit-docs', url: data.origin },
	...(data.lastModified && { dateModified: data.lastModified }),
}
```

Extend the object literal to add fields (author, publisher, image). Other schema types — `BlogPosting`, `HowTo`, `FAQPage` — are a `'@type'` swap away.

> **Warning:** The block is rendered with `{@html}`. Frontmatter values are user-authored — fine for your own site, risky if you accept community contributions without sanitization.

## robots.txt

For a fully indexable docs site, ship a minimal `static/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://docs.example.com/sitemap.xml
```

To stage unindexed previews (PR builds, staging branch), conditionally serve a disallow-all variant via an environment flag:

```nginx
location = /robots.txt {
    if ($host != "docs.example.com") {
        return 200 "User-agent: *\nDisallow: /\n";
    }
}
```

## Performance signals

A few low-effort wins for Lighthouse and Core Web Vitals:

- **Preconnect to font hosts.** Add `<link rel="preconnect">` if you load fonts from Google or another CDN.
- **Inline critical CSS.** SvelteKit already does this for the layout shell.
- **Cache hashed assets.** See [deployment](/deployment.html) for the `_app/immutable/` nginx rule.
- **Avoid layout shift.** The on-this-page nav uses `position: sticky` rather than JS scroll handlers — keep it that way.

Run `pnpm build && pnpm preview` and audit with `npx unlighthouse --site http://localhost:4173` for a full picture.

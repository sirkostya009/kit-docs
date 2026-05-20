---
title: SEO and sitemap
description: Meta tags, Open Graph cards, and the prerendered sitemap.
---

# SEO and sitemap

Every page is prerendered to static HTML, so search engines see the same content as users — no client-side hydration trick required.

## Meta tags

The page layout in `[...slug].html/+page.svelte` emits a standard set of tags from frontmatter:

```svelte
<svelte:head>
	<title>{title}</title>
	<meta name="description" content={data.metadata.description ?? ''} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={data.metadata.description ?? ''} />
	<meta property="og:type" content="article" />
</svelte:head>
```

The root layout adds the site name once:

```svelte
<meta property="og:site_name" content="kit-docs" />
```

The page title is composed as `${frontmatter.title} · kit-docs`. Override the suffix by editing the `title` derivation in `+page.svelte`.

## Open Graph images

Drop a per-page OG image into `static/og/<slug>.png` and add a frontmatter field:

```yaml
ogImage: /og/getting-started.png
```

Then read it in the page head:

```svelte
{#if data.metadata.ogImage}
	<meta property="og:image" content={data.metadata.ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
{/if}
```

For automatic OG image generation, point a build step at [`@vercel/og`](https://vercel.com/docs/og-image-generation) or [Satori](https://github.com/vercel/satori) and write the output to `static/og/` before `pnpm build` runs.

> **Tip:** The recommended OG dimensions are 1200×630. Keep the file under 1 MB so social embedders don't drop it.

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

The default sitemap does not emit `<lastmod>`. To add it, plumb the git timestamp through `getPage()` (or read `lastModified` from frontmatter — see [frontmatter](/frontmatter.html)) and append it to each entry:

```typescript
`\t\t<lastmod>${page.lastModified}</lastmod>`;
```

Most search engines treat `lastmod` as a hint, not a guarantee.

## Structured data

For docs that should appear as rich snippets, add a `<script type="application/ld+json">` block in the page head. The minimal recipe for an article:

```svelte
{@html `<script type="application/ld+json">${JSON.stringify({
	'@context': 'https://schema.org',
	'@type': 'TechArticle',
	headline: data.metadata.title,
	description: data.metadata.description,
	dateModified: data.metadata.lastModified
})}</script>`}
```

> **Warning:** Use `{@html}` only with data you fully control. Frontmatter values are user-authored — fine for your own site, risky if you accept community contributions without sanitization.

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

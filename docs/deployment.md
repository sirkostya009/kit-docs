---
title: Deployment
description: Ship the prerendered output to any static host or container runtime.
---

# Deployment

Every page is prerendered at build time, so the output of `pnpm build` is a static `build/` directory you can drop on any host.

## Static hosting

The simplest path: upload `build/` to a CDN or object store.

```bash
pnpm build
# build/ now contains index.html, *.html, *.md, sitemap.xml, _app/...
```

Works on Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3 + CloudFront, or `nginx -g 'daemon off;'`.

### Required server config

Two rules cover most hosts:

- `text/html` for `*.html` (default).
- `text/markdown; charset=utf-8` for `*.md`. The raw source link in the sidebar relies on this.

### nginx example

```nginx
server {
    root /usr/share/nginx/html;

    types {
        text/markdown md;
    }

    location / {
        try_files $uri $uri.html $uri/index.html =404;
    }
}
```

## Docker

A multi-stage `Dockerfile` ships with the repo. The runtime image is ~19 MB on alpine.

```bash
docker build -t kit-docs .
docker run --rm -p 8080:80 kit-docs
```

The build stage runs `pnpm install --frozen-lockfile && pnpm build`. The runtime stage copies only `build/` into `nginx:alpine` and uses the bundled `nginx.conf`.

### Customizing the image

To override the origin used in `sitemap.xml`, pass `ORIGIN` (or `PUBLIC_ORIGIN`) at build time:

```bash
ORIGIN=https://docs.example.com pnpm build
docker build -t kit-docs .
```

> **Note:** The sitemap origin is baked in at build time because the file is prerendered. Rebuild the image when the canonical hostname changes.

## Node adapter

If you need server-side features later (auth, dynamic redirects), swap `@sveltejs/adapter-static` for `@sveltejs/adapter-node` in `svelte.config.js`:

```diff
- import adapter from '@sveltejs/adapter-static';
+ import adapter from '@sveltejs/adapter-node';
```

Run with:

```bash
HOST=0.0.0.0 PORT=3000 node build
```

Every route still prerenders — the Node server just serves the resulting HTML and exposes API routes for anything you add later.

## Edge adapters

`adapter-cloudflare` and `adapter-vercel` are drop-in replacements. The prerender directive on each route means the output is fully static; the edge runtime is only invoked for routes you opt into dynamic rendering on.

| Adapter              | Output             | Best for                          |
| -------------------- | ------------------ | --------------------------------- |
| `adapter-static`     | Plain `build/`     | CDN, S3, GitHub Pages, nginx      |
| `adapter-node`       | Node server bundle | Self-hosted with future API needs |
| `adapter-cloudflare` | Workers + assets   | Cloudflare Pages                  |
| `adapter-vercel`     | Vercel functions   | Vercel + ISR                      |

## Cache headers

Hashed assets under `_app/` are fingerprinted — cache them aggressively:

```nginx
location /_app/immutable/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

HTML and `.md` files change with every deploy, so leave those at the default `Cache-Control: public, max-age=0, must-revalidate`.

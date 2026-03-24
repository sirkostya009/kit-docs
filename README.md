# kit-docs

a template for sveltekit-based static docs sites. prerenders markdown to static html, with every page also available as raw `.md`.

## stack

- [sveltekit](https://kit.svelte.dev) + [`adapter-static`](https://kit.svelte.dev/docs/adapter-static)
- [mdsvex](https://mdsvex.pngwn.io) for markdown → svelte compilation
- [tailwindcss v4](https://tailwindcss.com) + [`@tailwindcss/typography`](https://tailwindcss.com/docs/typography-plugin)
- [shiki](https://shiki.style) for syntax highlighting

## docs

drop `.md` files into `docs/`. frontmatter supports `title` and `description`:

```md
---
title: Getting Started
description: how to get up and running
---

# Getting Started

...
```

each file is prerendered to `/<slug>` (html) and `/<slug>.md` (raw source).

## dev

```sh
pnpm install
pnpm dev
```

## build

```sh
pnpm build
```

output goes to `build/`. serve with any static file server — nginx with `gzip_static on` and `brotli_static on` is recommended since the build includes precompressed `.gz` and `.br` files.

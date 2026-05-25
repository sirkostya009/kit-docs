# kit-docs

a template for sveltekit-based static docs sites. prerenders markdown to static html, with every page also available as raw `.md`.

## stack

- [sveltekit](https://kit.svelte.dev) + [`adapter-static`](https://kit.svelte.dev/docs/adapter-static)
- [unified](https://unifiedjs.com) pipeline (remark + rehype) for markdown processing
- [tailwindcss v4](https://tailwindcss.com) + [`@tailwindcss/typography`](https://tailwindcss.com/docs/typography-plugin)
- [shiki](https://shiki.style) for syntax highlighting
- [temml](https://temml.org) for math, [mermaid-isomorphic](https://github.com/remcohaszing/mermaid-isomorphic) for ssr diagrams
- [minisearch](https://lucaong.github.io/minisearch/) for client-side search

## features

- markdown pages prerendered to static html + raw `.md` companion for llms
- admonitions, tabs, math (`$…$`), mermaid diagrams - all rendered at build time
- code blocks with titles, line numbers, line highlighting, and diff notation
- auto-generated table of contents and slugged headings
- client-side search modal over a prebuilt index
- broken-link check runs inside the adapter (after prerender) and fails the build on dead targets
- precompressed `.gz` and `.br` assets

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

each file is prerendered to `/<slug>.html` and `/<slug>.md`. see [`docs/`](./docs) for the full reference (frontmatter, configuration, markdown showcase, deployment).

## dev

```sh
pnpm install
pnpm dev
```

## build

```sh
pnpm build
```

output goes to `build/`. serve with any static file server — nginx with `gzip_static on` and `brotli_static on` is recommended since the build includes precompressed `.gz` and `.br` files. a sample [`nginx.conf`](./nginx.conf) and [`Dockerfile`](./Dockerfile) are included.

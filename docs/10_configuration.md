---
title: Configuration
description: Configuring your project
---

# Configuration

All configuration lives in `svelte.config.js`.

## Adapter

This project uses `adapter-static` for fully static output.

## Markdown pipeline

Markdown is processed by a [unified](https://unifiedjs.com) pipeline configured in `src/lib/server/content/processor.ts`. Remark handles parsing and GFM/math/directive extensions; rehype handles slugging, code highlighting via [shiki](https://shiki.style), and SSR for math and mermaid diagrams.

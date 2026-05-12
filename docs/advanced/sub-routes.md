---
title: Sub-routes
description: Organize docs into folders
---

# Sub-routes

Drop a markdown file into any subdirectory under `docs/` and it gets picked up as a nested route.

```
docs/
  getting-started.md       → /getting-started.html
  guides/
    installation.md        → /guides/installation.html
    customization.md       → /guides/customization.html
  advanced/
    sub-routes.md          → /advanced/sub-routes.html
```

## How it works

The route `[...slug].html` uses SvelteKit's rest parameter syntax, so any number of path segments are captured before the literal `.html` suffix.

## Sidebar grouping

Top-level files render as flat entries. Files in subdirectories get grouped under the directory name in the sidebar.

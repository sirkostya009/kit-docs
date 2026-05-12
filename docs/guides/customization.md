---
title: Customization
description: Theme, fonts, and brand tweaks
---

# Customization

## Colors

Theme tokens live in `src/app.css` under `:root` and `.dark`. Override the CSS custom properties to rebrand.

```css
:root {
	--primary: #5b73e8;
	--surface: #ffffff;
}
```

## Fonts

Change `--font-sans` in the `@theme inline` block. Tailwind's `font-sans` utility picks it up automatically.

## Code highlighting

Shiki themes are configured in `src/lib/server/content.ts`. Default dual-theme is `github-light` / `github-dark`.

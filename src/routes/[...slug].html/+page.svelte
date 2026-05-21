<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	const { data } = $props();
	const pageTitle = $derived(data.metadata.title ?? 'kit-docs');
	const title = $derived(data.metadata.title ? `${data.metadata.title} · kit-docs` : 'kit-docs');
	const description = $derived(data.metadata.description ?? '');
	const canonicalUrl = $derived(`${data.origin}/${data.slug}.html`);
	const ldScript = $derived(
		'<script type="application/ld+json">' +
			JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'TechArticle',
				headline: pageTitle,
				...(description && { description }),
				url: canonicalUrl,
				mainEntityOfPage: canonicalUrl,
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'kit-docs', url: data.origin },
				...(data.lastModified && { dateModified: data.lastModified }),
			}) +
			'</' +
			'script>',
	);

	const crumbs = $derived.by(() => {
		const groupTitles = Object.fromEntries(
			data.nav.groups.map((g) => [g.name, g.name.replace(/-/g, ' ')]),
		);
		const parts = data.slug.split('/');
		const out: Array<{ label: string; href: string | null }> = [];
		for (let i = 0; i < parts.length - 1; i++) {
			const name = parts[i];
			out.push({ label: groupTitles[name] ?? name, href: null });
		}
		return out;
	});

	const lastModifiedLabel = $derived.by(() => {
		if (!data.lastModified) return null;
		const d = new Date(data.lastModified);
		return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
	});

	let article = $state<HTMLElement>();
	let mobileTocOpen = $state(false);
	const active = new SvelteSet<string>();

	$effect(() => {
		void data.slug;
		if (!article) return;
		const headings = [...article.querySelectorAll<HTMLElement>('h2[id], h3[id]')];
		if (headings.length === 0) return;

		function compute() {
			const vh = window.innerHeight;
			const articleBottom = article!.getBoundingClientRect().bottom;
			const visible: string[] = [];
			for (let i = 0; i < headings.length; i++) {
				const top = headings[i].getBoundingClientRect().top;
				const bottom =
					i + 1 < headings.length ? headings[i + 1].getBoundingClientRect().top : articleBottom;
				if (bottom > 0 && top < vh) visible.push(headings[i].id);
			}
			for (const id of active) if (!visible.includes(id)) active.delete(id);
			for (const id of visible) active.add(id);
		}

		const observer = new IntersectionObserver(compute, { rootMargin: '0px' });
		for (const h of headings) observer.observe(h);
		compute();
		return () => observer.disconnect();
	});

	$effect(() => {
		void data.slug;
		if (!article) return;
		const copySvg =
			'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
		const checkSvg =
			'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
		const wrapSvg =
			'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 21 6"/><path d="M3 12h15a3 3 0 0 1 0 6h-4"/><polyline points="16 16 14 18 16 20"/><line x1="3" y1="18" x2="10" y2="18"/></svg>';
		const pres = article.querySelectorAll<HTMLPreElement>('pre.shiki');
		const cleanups: Array<() => void> = [];
		for (const pre of pres) {
			if (pre.querySelector('button.copy-code')) continue;

			const wrap = document.createElement('button');
			wrap.type = 'button';
			wrap.className = 'wrap-code';
			wrap.setAttribute('aria-label', 'toggle line wrap');
			wrap.setAttribute('aria-pressed', 'false');
			wrap.innerHTML = wrapSvg;
			const onWrapClick = () => {
				const enabled = pre.toggleAttribute('data-wrap');
				wrap.setAttribute('aria-pressed', enabled ? 'true' : 'false');
			};
			wrap.addEventListener('click', onWrapClick);
			pre.appendChild(wrap);

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'copy-code';
			btn.setAttribute('aria-label', 'copy code');
			btn.innerHTML = copySvg;
			let timeout: ReturnType<typeof setTimeout> | null = null;
			const onCopyClick = async () => {
				const code = pre.querySelector('code')?.innerText ?? pre.innerText;
				try {
					await navigator.clipboard.writeText(code);
					btn.innerHTML = checkSvg;
					btn.dataset.state = 'copied';
					if (timeout) clearTimeout(timeout);
					timeout = setTimeout(() => {
						btn.innerHTML = copySvg;
						delete btn.dataset.state;
					}, 1500);
				} catch {
					btn.dataset.state = 'failed';
				}
			};
			btn.addEventListener('click', onCopyClick);
			pre.appendChild(btn);

			cleanups.push(() => {
				if (timeout) clearTimeout(timeout);
				btn.removeEventListener('click', onCopyClick);
				btn.remove();
				wrap.removeEventListener('click', onWrapClick);
				wrap.remove();
			});
		}
		return () => {
			for (const fn of cleanups) fn();
		};
	});
</script>

<svelte:head>
	<title>{title}</title>
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" type="text/markdown" href="/{data.slug}.md" />
	{#if description}
		<meta name="description" content={description} />
	{/if}
	<meta property="og:title" content={pageTitle} />
	{#if description}
		<meta property="og:description" content={description} />
	{/if}
	<meta property="og:type" content="article" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={pageTitle} />
	{#if description}
		<meta name="twitter:description" content={description} />
	{/if}
	{#if data.lastModified}
		<meta property="article:modified_time" content={data.lastModified} />
		<meta name="last-modified" content={data.lastModified} />
	{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html ldScript}
</svelte:head>

<div class="flex min-w-0">
	<div class="mx-auto max-w-3xl min-w-0 flex-1 px-4 py-8 md:px-8 md:py-12 lg:mx-0 lg:max-w-none">
		{#if crumbs.length > 0}
			<nav
				class="text-foreground-subtle mb-4 flex flex-wrap items-center gap-1.5 text-xs capitalize"
				aria-label="breadcrumb"
			>
				<a href="/" class="hover:text-foreground no-underline transition-colors">Docs</a>
				{#each crumbs as crumb (crumb.label)}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
					<span>{crumb.label}</span>
				{/each}
			</nav>
		{/if}

		{#if data.headings.length > 0}
			<details
				bind:open={mobileTocOpen}
				class="border-border-subtle bg-surface-raised mobile-toc mb-6 rounded-lg border lg:hidden"
			>
				<summary
					class="text-foreground-muted hover:text-foreground flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium select-none"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						class="chevron"
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
					On this page
				</summary>
				<ul class="border-border-subtle border-t px-4 py-2">
					{#each data.headings as h (h.id)}
						<li>
							<a
								href="#{h.id}"
								data-sveltekit-noscroll
								onclick={() => (mobileTocOpen = false)}
								class={[
									'text-foreground-muted hover:text-foreground block truncate py-1 text-sm no-underline transition-colors',
									h.level === 3 ? 'pl-4' : '',
								]}>{h.text}</a
							>
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		<article bind:this={article} class="prose max-w-none">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html data.html}
		</article>

		{#if lastModifiedLabel}
			<p class="text-foreground-subtle mt-12 text-xs">
				Last updated on <time datetime={data.lastModified ?? ''}>{lastModifiedLabel}</time>
			</p>
		{/if}

		{#if data.prev || data.next}
			<nav
				class="border-border-subtle mt-16 grid grid-cols-1 gap-3 border-t pt-8 sm:grid-cols-2"
				aria-label="page navigation"
			>
				{#if data.prev}
					<a
						href="/{data.prev.slug}.html"
						class="group border-border bg-surface-raised hover:border-primary/40 flex flex-col rounded-lg border p-4 no-underline transition-colors"
					>
						<span class="text-foreground-subtle inline-flex items-center gap-1 text-xs">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg
							>
							Previous
						</span>
						<span
							class="text-foreground group-hover:text-primary mt-1 font-medium transition-colors"
							>{data.prev.title}</span
						>
					</a>
				{:else}
					<div></div>
				{/if}
				{#if data.next}
					<a
						href="/{data.next.slug}.html"
						class="group border-border bg-surface-raised hover:border-primary/40 flex flex-col items-end rounded-lg border p-4 text-right no-underline transition-colors"
					>
						<span class="text-foreground-subtle inline-flex items-center gap-1 text-xs">
							Next
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg
							>
						</span>
						<span
							class="text-foreground group-hover:text-primary mt-1 font-medium transition-colors"
							>{data.next.title}</span
						>
					</a>
				{/if}
			</nav>
		{/if}
	</div>

	<aside class="mr-8 w-56 shrink-0 py-8 max-lg:hidden">
		<nav class="sticky top-24">
			{#if data.headings.length > 0}
				<p class="text-foreground-subtle mb-3 text-[0.7rem] font-semibold tracking-wider uppercase">
					On this page
				</p>
				<ul class="border-border-subtle mb-6 border-l">
					{#each data.headings as h (h.id)}
						<li>
							<a
								href="#{h.id}"
								data-sveltekit-noscroll
								class={[
									'-ml-px block truncate border-l-2 py-1 text-sm no-underline transition-colors',
									active.has(h.id)
										? 'border-primary text-primary font-medium'
										: 'text-foreground-muted hover:text-foreground border-transparent',
									h.level === 3 ? 'pl-6' : 'pl-3',
								]}>{h.text}</a
							>
						</li>
					{/each}
				</ul>
			{/if}
			<a
				href="/{data.slug}.md"
				data-sveltekit-reload
				class="text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs no-underline transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline
						points="14 2 14 8 20 8"
					/></svg
				>
				View source
			</a>
		</nav>
	</aside>
</div>

<style>
	.mobile-toc > summary {
		list-style: none;
	}

	.mobile-toc > summary::-webkit-details-marker {
		display: none;
	}

	.mobile-toc > summary .chevron {
		transition: transform 0.15s ease;
	}

	.mobile-toc[open] > summary .chevron {
		transform: rotate(90deg);
	}

	.prose {
		--tw-prose-body: var(--foreground);
		--tw-prose-headings: var(--foreground);
		--tw-prose-lead: var(--foreground-muted);
		--tw-prose-links: var(--primary);
		--tw-prose-bold: var(--foreground);
		--tw-prose-counters: var(--foreground-muted);
		--tw-prose-bullets: var(--border);
		--tw-prose-hr: var(--border-subtle);
		--tw-prose-quotes: var(--foreground);
		--tw-prose-quote-borders: var(--primary);
		--tw-prose-captions: var(--foreground-muted);
		--tw-prose-code: var(--foreground);
		--tw-prose-pre-code: var(--foreground);
		--tw-prose-pre-bg: var(--surface-raised);
		--tw-prose-th-borders: var(--border);
		--tw-prose-td-borders: var(--border-subtle);
		font-size: 0.975rem;
	}

	:global(.prose h1) {
		font-size: 2.25rem;
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.15;
		margin-bottom: 0.5rem;
	}

	:global(.prose h1 + p) {
		font-size: 1.125rem;
		color: var(--foreground-muted);
		margin-top: 0;
	}

	:global(.prose h2) {
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.015em;
		margin-top: 3rem;
		padding-top: 0;
		border-top: none;
	}

	:global(.prose h3) {
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin-top: 2rem;
	}

	:global(.prose h2 a[href^='#']),
	:global(.prose h3 a[href^='#']) {
		color: var(--foreground-subtle);
		text-decoration: none;
		opacity: 0;
		transition: opacity 0.15s;
		margin-left: 0.4em;
		font-weight: 400;
	}

	:global(.prose h2:hover a[href^='#']),
	:global(.prose h3:hover a[href^='#']) {
		opacity: 1;
	}

	:global(.prose :not(pre) > code::before),
	:global(.prose :not(pre) > code::after) {
		content: none;
	}

	:global(.prose :not(pre):not(.shiki) > code) {
		background: var(--surface-overlay);
		border: 1px solid var(--border-subtle);
		border-radius: 0.375rem;
		padding: 0.15em 0.4em;
		font-size: 0.85em;
		font-weight: 500;
	}

	:global(.prose input[type='checkbox']) {
		appearance: none;
		-webkit-appearance: none;
		width: 1em;
		height: 1em;
		margin: 0 0.4em 0 0;
		border: 1px solid var(--border);
		border-radius: 0.25em;
		background: var(--surface-raised);
		cursor: default;
		display: inline-block;
		position: relative;
		vertical-align: -0.15em;
	}

	:global(.prose input[type='checkbox']:checked) {
		background: var(--primary);
		border-color: var(--primary);
	}

	:global(.dark .prose input[type='checkbox']:checked) {
		background: var(--color-primary-600);
		border-color: var(--color-primary-600);
	}

	:global(.prose input[type='checkbox']:checked::after) {
		content: '';
		position: absolute;
		inset: 0;
		background: white;
		-webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8.5l3.5 3.5L13 5'/></svg>")
			no-repeat center / 80%;
		mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8.5l3.5 3.5L13 5'/></svg>")
			no-repeat center / 80%;
	}

	:global(.prose pre) {
		border-radius: 0.5rem;
		border: 1px solid var(--border);
		padding: 0;
		background: var(--surface-raised);
	}

	:global(.prose pre.shiki) {
		padding: 1rem 1.25rem;
		border-radius: 0.5rem;
		border: 1px solid var(--border);
		overflow-x: auto;
		font-size: 0.85em;
		background: var(--surface-raised) !important;
	}

	:global(.shiki),
	:global(.shiki span) {
		color: var(--shiki-light);
	}

	:global(.dark .shiki),
	:global(.dark .shiki span) {
		color: var(--shiki-dark);
	}

	:global(.prose a) {
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in oklab, var(--primary) 40%, transparent);
		font-weight: 500;
	}

	:global(.prose a:hover) {
		text-decoration-color: var(--primary);
	}

	:global(.prose blockquote) {
		font-style: normal;
		padding: 1rem 1.25rem;
		border-radius: 0 0.375rem 0.375rem 0;
		border-left-width: 3px;
		--bq-c: var(--color-primary-500);
		--bq-c-dark: var(--color-primary-400);
		border-left-color: var(--bq-c);
		background: color-mix(in oklab, var(--bq-c) 12%, transparent);
	}

	:global(.prose blockquote blockquote) {
		--bq-c: var(--color-yellow-500);
		--bq-c-dark: var(--color-yellow-400);
	}

	:global(.prose blockquote blockquote blockquote) {
		--bq-c: var(--color-red-500);
		--bq-c-dark: var(--color-red-400);
	}

	:global(.prose blockquote blockquote blockquote blockquote) {
		--bq-c: var(--color-orange-500);
		--bq-c-dark: var(--color-orange-400);
	}

	:global(.prose blockquote blockquote blockquote blockquote blockquote) {
		--bq-c: var(--color-green-500);
		--bq-c-dark: var(--color-green-400);
	}

	:global(.prose blockquote blockquote blockquote blockquote blockquote blockquote) {
		--bq-c: var(--color-purple-500);
		--bq-c-dark: var(--color-purple-400);
	}

	:global(.prose blockquote blockquote blockquote blockquote blockquote blockquote blockquote) {
		--bq-c: var(--color-pink-500);
		--bq-c-dark: var(--color-pink-400);
	}

	:global(
		.prose blockquote blockquote blockquote blockquote blockquote blockquote blockquote blockquote
	) {
		--bq-c: var(--color-teal-500);
		--bq-c-dark: var(--color-teal-400);
	}

	:global(.dark .prose blockquote) {
		border-left-color: var(--bq-c-dark);
		background: color-mix(in oklab, var(--bq-c-dark) 8%, transparent);
	}

	:global(.prose blockquote ::selection),
	:global(.prose blockquote::selection) {
		background: color-mix(in oklab, currentColor 30%, transparent);
		color: var(--foreground);
	}

	:global(.prose blockquote p) {
		margin: 0;
	}

	:global(.prose blockquote p::before),
	:global(.prose blockquote p::after) {
		content: none;
	}

	:global(.prose table) {
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		overflow: hidden;
		border-collapse: separate;
		border-spacing: 0;
	}

	:global(.prose thead) {
		background: var(--surface-overlay);
	}

	:global(.prose th),
	:global(.prose td) {
		padding: 0.6rem 0.85rem;
	}

	:global(.prose .admonition) {
		--admonition-color: var(--color-primary-500);
		margin: 1.5rem 0;
		padding: 0.75rem 1rem;
		border-left: 3px solid var(--admonition-color);
		background: color-mix(in oklab, var(--admonition-color) 10%, transparent);
		border-radius: 0 0.375rem 0.375rem 0;
	}

	:global(.dark .prose .admonition) {
		background: color-mix(in oklab, var(--admonition-color) 14%, transparent);
	}

	:global(.prose .admonition .admonition-title) {
		margin: 0 0 0.35rem;
		font-weight: 600;
		font-size: 0.85rem;
		text-transform: capitalize;
		color: var(--admonition-color);
		letter-spacing: 0.01em;
	}

	:global(.dark .prose .admonition .admonition-title) {
		color: color-mix(in oklab, var(--admonition-color) 70%, white);
	}

	:global(.prose .admonition > :not(.admonition-title)) {
		margin: 0.35rem 0;
	}

	:global(.prose .admonition > :last-child) {
		margin-bottom: 0;
	}

	:global(.prose .admonition-note),
	:global(.prose .admonition-info) {
		--admonition-color: var(--color-primary-500);
	}
	:global(.prose .admonition-tip) {
		--admonition-color: #16a34a;
	}
	:global(.prose .admonition-warning) {
		--admonition-color: #d97706;
	}
	:global(.prose .admonition-caution) {
		--admonition-color: #ea580c;
	}
	:global(.prose .admonition-danger) {
		--admonition-color: #dc2626;
	}

	:global(.prose .shiki[data-title]) {
		padding-top: 3rem !important;
		position: relative;
	}

	:global(.prose .shiki[data-title])::before {
		content: attr(data-title);
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2rem;
		display: flex;
		align-items: center;
		padding: 0 1.25rem;
		box-sizing: border-box;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
		color: var(--foreground-muted);
		background: var(--surface-overlay);
		border-bottom: 1px solid var(--border-subtle);
		border-radius: 0.5rem 0.5rem 0 0;
	}

	:global(.prose .shiki .line.highlighted) {
		display: inline-block;
		width: calc(100% + 2.5rem);
		margin: 0 -1.25rem;
		padding: 0 1.25rem;
		background: color-mix(in oklab, var(--color-primary-500) 12%, transparent);
		border-left: 2px solid var(--color-primary-500);
		padding-left: calc(1.25rem - 2px);
	}

	:global(.prose .shiki .line.diff) {
		display: inline-block;
		width: calc(100% + 2.5rem);
		margin: 0 -1.25rem;
		padding: 0 1.25rem;
		position: relative;
	}

	:global(.prose .shiki .line.diff.add) {
		background: color-mix(in oklab, #16a34a 14%, transparent);
	}

	:global(.prose .shiki .line.diff.remove) {
		background: color-mix(in oklab, #dc2626 16%, transparent);
		opacity: 0.85;
	}

	:global(.prose .shiki .line.diff)::before {
		position: absolute;
		left: 0.4rem;
		font-weight: 600;
	}

	:global(.prose .shiki .line.diff.add)::before {
		content: '+';
		color: #16a34a;
	}

	:global(.prose .shiki .line.diff.remove)::before {
		content: '-';
		color: #dc2626;
	}

	:global(.prose pre.shiki) {
		position: relative;
	}

	:global(.prose pre.shiki > button.copy-code),
	:global(.prose pre.shiki > button.wrap-code) {
		position: absolute;
		top: 0.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		color: var(--foreground-muted);
		background: var(--surface-overlay);
		border: 1px solid var(--border-subtle);
		border-radius: 0.3rem;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			color 0.15s ease,
			background-color 0.15s ease;
	}

	:global(.prose pre.shiki > button.copy-code) {
		right: 0.5rem;
	}

	:global(.prose pre.shiki > button.wrap-code) {
		right: 2.5rem;
	}

	:global(.prose pre.shiki:hover > button.copy-code),
	:global(.prose pre.shiki:hover > button.wrap-code),
	:global(.prose pre.shiki > button.copy-code:focus-visible),
	:global(.prose pre.shiki > button.wrap-code:focus-visible) {
		opacity: 1;
	}

	:global(.prose pre.shiki > button.copy-code:hover),
	:global(.prose pre.shiki > button.wrap-code:hover) {
		color: var(--foreground);
		background: var(--surface-raised);
	}

	:global(.prose pre.shiki > button.copy-code[data-state='copied']) {
		color: #16a34a;
		opacity: 1;
	}

	:global(.prose pre.shiki > button.wrap-code[aria-pressed='true']) {
		color: var(--primary);
		border-color: color-mix(in oklab, var(--primary) 40%, transparent);
		opacity: 1;
	}

	:global(.prose pre.shiki[data-title] > button.copy-code),
	:global(.prose pre.shiki[data-title] > button.wrap-code) {
		top: 0.25rem;
		width: 1.5rem;
		height: 1.5rem;
	}

	:global(.prose pre.shiki[data-title] > button.wrap-code) {
		right: 2.2rem;
	}

	:global(.prose pre.shiki[data-lang])::after {
		content: attr(data-lang);
		position: absolute;
		top: 0.55rem;
		right: 0.7rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.7rem;
		color: var(--foreground-subtle);
		letter-spacing: 0.02em;
		pointer-events: none;
		transition: opacity 0.15s ease;
	}

	:global(.prose pre.shiki[data-lang]:hover)::after,
	:global(.prose pre.shiki[data-lang]:focus-within)::after {
		opacity: 0;
	}

	:global(.prose pre.shiki[data-title][data-lang])::after {
		top: 0.4rem;
		right: 0.85rem;
	}

	:global(.prose pre.shiki[data-line-numbers]) {
		counter-reset: shiki-line;
	}

	:global(.prose pre.shiki[data-line-numbers] code) {
		display: grid;
	}

	:global(.prose pre.shiki[data-line-numbers] .line) {
		counter-increment: shiki-line;
	}

	:global(.prose pre.shiki[data-line-numbers] .line)::before {
		content: counter(shiki-line);
		display: inline-block;
		width: 1.75em;
		margin-right: 1.25rem;
		text-align: right;
		color: var(--foreground-subtle);
		user-select: none;
	}

	:global(.prose pre.shiki[data-wrap] code) {
		white-space: pre-wrap;
		word-break: break-word;
	}

	:global(.prose :not(pre) > span.shiki) {
		background: var(--surface-overlay);
		border: 1px solid var(--border-subtle);
		border-radius: 0.375rem;
		padding: 0.15em 0.4em;
		font-size: 0.85em;
		font-weight: 500;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	:global(.prose :not(pre) > span.shiki > code) {
		font-size: inherit;
		font-weight: inherit;
		color: inherit;
		font-family: inherit;
	}

	:global(.prose :not(pre) > span.shiki span) {
		color: var(--shiki-light);
	}

	:global(.dark .prose :not(pre) > span.shiki span) {
		color: var(--shiki-dark);
	}
</style>

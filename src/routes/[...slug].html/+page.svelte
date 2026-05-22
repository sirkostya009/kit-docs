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

	const crumbs = $derived(
		data.slug.split('/').map((name: string) => ({
			label: name.replace(/-/g, ' '),
			href: null,
		})),
	);

	const lastModifiedLabel = $derived(
		data.lastModified &&
			new Date(data.lastModified).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			}),
	);

	let article = $state<HTMLElement>();
	let mobileTocOpen = $state(false);
	let scrollProgress = $state(0);
	let currentSection = $state<string | null>(null);
	const active = new SvelteSet<string>();
	const currentSectionTitle = $derived(
		data.headings.find((h) => h.id === currentSection)?.text ?? null,
	);

	$effect(() => {
		void data.slug;
		if (!article) return;
		type Item = {
			id: string;
			level: 2 | 3;
			el: HTMLElement;
			sectionEl: HTMLElement | null;
		};
		const items: Item[] = data.headings
			.map((h): Item | null => {
				const trackId = h.level === 2 ? `${h.id}-heading` : h.id;
				const el = article!.querySelector<HTMLElement>(`[id="${trackId}"]`);
				if (!el) return null;
				const sectionEl =
					h.level === 2 ? article!.querySelector<HTMLElement>(`[id="${h.id}"]`) : null;
				return { id: h.id, level: h.level, el, sectionEl };
			})
			.filter((it): it is Item => it !== null);
		if (items.length === 0) return;

		function compute() {
			const vh = window.innerHeight;
			const minOverlap = vh * 0.2;
			const articleBottom = article!.getBoundingClientRect().bottom;
			const visible: string[] = [];
			for (let i = 0; i < items.length; i++) {
				const top = items[i].el.getBoundingClientRect().top;
				const bottom =
					i + 1 < items.length ? items[i + 1].el.getBoundingClientRect().top : articleBottom;
				const overlap = Math.max(0, Math.min(bottom, vh) - Math.max(top, 0));
				const sectionHeight = bottom - top;
				if (overlap >= minOverlap || (sectionHeight > 0 && overlap >= sectionHeight * 0.5))
					visible.push(items[i].id);
			}
			for (const id of active) if (!visible.includes(id)) active.delete(id);
			for (const id of visible) active.add(id);

			for (const it of items) {
				if (it.level !== 2 || !it.sectionEl) continue;
				const r = it.sectionEl.getBoundingClientRect();
				if (r.top <= vh * 0.3) currentSection = it.id;
				else break;
			}
		}

		const observer = new IntersectionObserver(compute, { rootMargin: '0px' });
		for (const it of items) observer.observe(it.el);
		compute();
		window.addEventListener('scroll', compute, { passive: true });
		window.addEventListener('resize', compute);
		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', compute);
			window.removeEventListener('resize', compute);
		};
	});

	$effect(() => {
		void data.slug;
		if (!article) return;
		function update() {
			const rect = article!.getBoundingClientRect();
			const vh = window.innerHeight;
			const range = rect.height - vh;
			if (range <= 0) {
				scrollProgress = rect.bottom <= vh ? 1 : 0;
				return;
			}
			scrollProgress = Math.max(0, Math.min(1, -rect.top / range));
		}
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
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

	$effect(() => {
		void data.slug;
		if (!article) return;
		const containers = [...article.querySelectorAll<HTMLElement>('.tabs')];
		if (containers.length === 0) return;
		const cleanups: Array<() => void> = [];

		function selectIndex(container: HTMLElement, idx: number) {
			const buttons = [
				...container.querySelectorAll<HTMLButtonElement>(':scope > .tabs-list button[role="tab"]'),
			];
			const panels = [...container.querySelectorAll<HTMLElement>(':scope > .tabs-panel')];
			buttons.forEach((b, i) => {
				const selected = i === idx;
				b.setAttribute('aria-selected', selected ? 'true' : 'false');
				b.tabIndex = selected ? 0 : -1;
			});
			panels.forEach((p, i) => p.toggleAttribute('hidden', i !== idx));
		}

		function applyToGroup(group: string, label: string) {
			const selector = `.tabs[data-tabs-group="${CSS.escape(group)}"]`;
			for (const t of article!.querySelectorAll<HTMLElement>(selector)) {
				const buttons = [
					...t.querySelectorAll<HTMLButtonElement>(':scope > .tabs-list button[role="tab"]'),
				];
				const idx = buttons.findIndex((b) => b.textContent?.trim() === label);
				if (idx >= 0) selectIndex(t, idx);
			}
		}

		for (const container of containers) {
			const buttons = [
				...container.querySelectorAll<HTMLButtonElement>(':scope > .tabs-list button[role="tab"]'),
			];
			if (buttons.length === 0) continue;
			const group = container.dataset.tabsGroup ?? null;

			if (group) {
				try {
					const stored = localStorage.getItem(`tab-group:${group}`);
					if (stored) {
						const idx = buttons.findIndex((b) => b.textContent?.trim() === stored);
						if (idx >= 0) selectIndex(container, idx);
					}
				} catch {
					// ignore
				}
			}

			buttons.forEach((btn, i) => {
				const onClick = () => {
					const label = btn.textContent?.trim() ?? '';
					if (group) {
						try {
							localStorage.setItem(`tab-group:${group}`, label);
						} catch {
							// ignore
						}
						applyToGroup(group, label);
					} else {
						selectIndex(container, i);
					}
				};
				const onKey = (e: KeyboardEvent) => {
					let target = -1;
					if (e.key === 'ArrowRight') target = (i + 1) % buttons.length;
					else if (e.key === 'ArrowLeft') target = (i - 1 + buttons.length) % buttons.length;
					else if (e.key === 'Home') target = 0;
					else if (e.key === 'End') target = buttons.length - 1;
					if (target < 0) return;
					e.preventDefault();
					buttons[target].focus();
					buttons[target].click();
				};
				btn.addEventListener('click', onClick);
				btn.addEventListener('keydown', onKey);
				cleanups.push(() => {
					btn.removeEventListener('click', onClick);
					btn.removeEventListener('keydown', onKey);
				});
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
				class="border-border-subtle bg-surface-raised mobile-toc sticky top-3.25 z-10 mb-6 rounded-lg border lg:hidden"
			>
				<summary
					class="text-foreground hover:text-foreground flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm font-medium select-none"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						aria-hidden="true"
						class="text-primary shrink-0"
					>
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							opacity="0.2"
						/>
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-dasharray="62.832"
							stroke-dashoffset={62.832 * (1 - scrollProgress)}
							transform="rotate(-90 12 12)"
							class="ring-progress"
						/>
					</svg>
					<span class="flex-1 truncate text-left">{currentSectionTitle ?? 'On this page'}</span>
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
						class="chevron text-foreground-subtle shrink-0"
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
				</summary>
				<ul class="border-border-subtle border-t px-4 py-2">
					{#each data.headings as h (h.id)}
						<li>
							<a
								href="#{h.id}"
								data-sveltekit-noscroll
								onclick={() => (mobileTocOpen = false)}
								class={[
									'block truncate py-1 text-sm no-underline transition-colors',
									active.has(h.id)
										? 'text-primary font-medium'
										: 'text-foreground-muted hover:text-foreground',
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

	.mobile-toc .ring-progress {
		transition: stroke-dashoffset 0.15s ease;
	}

	.mobile-toc[open] > ul {
		max-height: calc(100vh - 6rem);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.mobile-toc {
		interpolate-size: allow-keywords;
	}

	.mobile-toc::details-content {
		opacity: 0;
		block-size: 0;
		overflow: clip;
		transition:
			opacity 0.2s ease,
			block-size 0.2s ease,
			content-visibility 0.2s allow-discrete;
	}

	.mobile-toc[open]::details-content {
		opacity: 1;
		block-size: auto;
	}

	@starting-style {
		.mobile-toc[open]::details-content {
			opacity: 0;
			block-size: 0;
		}
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
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.35rem;
		font-weight: 600;
		font-size: 1rem;
		text-transform: capitalize;
		color: var(--admonition-color);
		letter-spacing: 0.01em;
	}

	:global(.prose .admonition .admonition-title)::before {
		content: '';
		display: inline-block;
		flex-shrink: 0;
		width: 1.35em;
		height: 1.35em;
		background-color: currentColor;
		-webkit-mask: var(--admonition-icon) center / contain no-repeat;
		mask: var(--admonition-icon) center / contain no-repeat;
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
		--admonition-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 16v-4'/><path d='M12 8h.01'/></svg>");
	}
	:global(.prose .admonition-tip) {
		--admonition-color: #16a34a;
		--admonition-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'/><path d='M9 18h6'/><path d='M10 22h4'/></svg>");
	}
	:global(.prose .admonition-warning) {
		--admonition-color: #d97706;
		--admonition-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/><path d='M12 9v4'/><path d='M12 17h.01'/></svg>");
	}
	:global(.prose .admonition-caution) {
		--admonition-color: #ea580c;
		--admonition-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><path d='M12 8v4'/><path d='M12 16h.01'/></svg>");
	}
	:global(.prose .admonition-danger) {
		--admonition-color: #dc2626;
		--admonition-icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2'/><path d='M12 8v4'/><path d='M12 16h.01'/></svg>");
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

	:global(.prose .tabs) {
		margin: 1.5rem 0;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--surface-raised);
		overflow: hidden;
	}

	:global(.prose .tabs-list) {
		display: flex;
		background: var(--surface-overlay);
		border-bottom: 1px solid var(--border-subtle);
		overflow-x: auto;
	}

	:global(.prose .tabs-list button[role='tab']) {
		flex: 0 0 auto;
		padding: 0 0.85rem;
		height: 2rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
		color: var(--foreground-subtle);
		background: transparent;
		border: 0;
		cursor: pointer;
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	:global(.prose .tabs-list button[role='tab']:hover) {
		color: var(--foreground-muted);
	}

	:global(.prose .tabs-list button[role='tab'][aria-selected='true']) {
		color: var(--foreground);
		background: var(--surface-raised);
	}

	:global(.prose .tabs-list button[role='tab']:focus-visible) {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
	}

	:global(.prose .tabs-panel) {
		padding: 1rem 1.25rem;
	}

	:global(.prose .tabs-panel:has(> pre.shiki:only-child)) {
		padding: 0;
	}

	:global(.prose .tabs-panel > pre.shiki) {
		border: 0;
		border-radius: 0;
		margin: 0;
		background: transparent !important;
	}

	:global(.prose .tabs-panel > pre.shiki[data-lang])::after {
		content: none;
	}

	:global(.prose .tabs-panel > pre.shiki[data-title])::before {
		background: var(--surface-raised);
		border-radius: 0;
	}

	:global(.prose .tabs-panel > :first-child) {
		margin-top: 0;
	}

	:global(.prose .tabs-panel > :last-child) {
		margin-bottom: 0;
	}
</style>

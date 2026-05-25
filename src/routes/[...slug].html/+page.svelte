<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import './prose.css';

	const { data, params } = $props();

	const navSlugs = $derived(Object.keys(data.nav));
	const navIdx = $derived(navSlugs.indexOf(params.slug));
	const prev = $derived(
		navIdx > 0 ? { slug: navSlugs[navIdx - 1], title: data.nav[navSlugs[navIdx - 1]] } : null,
	);
	const next = $derived(
		navIdx >= 0 && navIdx < navSlugs.length - 1
			? { slug: navSlugs[navIdx + 1], title: data.nav[navSlugs[navIdx + 1]] }
			: null,
	);
	const pageTitle = $derived(data.metadata.title ?? 'kit-docs');
	const title = $derived(data.metadata.title ? `${data.metadata.title} · kit-docs` : 'kit-docs');
	const description = $derived(data.metadata.description ?? '');
	const canonicalUrl = $derived(`${data.origin}/${params.slug}.html`);
	const markdownUrl = $derived(`${data.origin}/${params.slug}.md`);
	const aiPrompt = $derived(`Please read ${markdownUrl} and prepare to answer questions about it.`);
	const chatgptUrl = $derived(`https://chatgpt.com/?q=${encodeURIComponent(aiPrompt)}`);
	const claudeUrl = $derived(`https://claude.ai/new?q=${encodeURIComponent(aiPrompt)}`);

	let popoverOpen = $state(false);
	let copyState = $state<'idle' | 'copied' | 'failed'>('idle');
	let copyResetTimer: ReturnType<typeof setTimeout> | null = null;
	async function copyMarkdown() {
		try {
			const res = await fetch(`/${params.slug}.md`);
			const text = await res.text();
			await navigator.clipboard.writeText(text);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
		if (copyResetTimer) clearTimeout(copyResetTimer);
		copyResetTimer = setTimeout(() => (copyState = 'idle'), 1500);
	}
	let copyUrlState = $state<'idle' | 'copied' | 'failed'>('idle');
	let copyUrlResetTimer: ReturnType<typeof setTimeout> | null = null;
	async function copyMarkdownUrl() {
		try {
			await navigator.clipboard.writeText(markdownUrl);
			copyUrlState = 'copied';
		} catch {
			copyUrlState = 'failed';
		}
		if (copyUrlResetTimer) clearTimeout(copyUrlResetTimer);
		copyUrlResetTimer = setTimeout(() => (copyUrlState = 'idle'), 1500);
	}
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
		params.slug.split('/').map((name: string) => ({
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
	const lastModifiedTitle = $derived(
		data.lastModified &&
			new Date(data.lastModified).toLocaleString(undefined, {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				timeZoneName: 'short',
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
		void params.slug;
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
		void params.slug;
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
		void params.slug;
		if (!article) return;
		const pres = article.querySelectorAll<HTMLPreElement>('pre.shiki');
		const cleanups: Array<() => void> = [];
		for (const pre of pres) {
			if (pre.querySelector('button.copy-code')) continue;

			const wrap = document.createElement('button');
			wrap.type = 'button';
			wrap.className = 'wrap-code';
			wrap.setAttribute('aria-label', 'toggle line wrap');
			wrap.setAttribute('aria-pressed', 'false');
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
			let timeout: ReturnType<typeof setTimeout> | null = null;
			const onCopyClick = async () => {
				const code = pre.querySelector('code')?.innerText ?? pre.innerText;
				try {
					await navigator.clipboard.writeText(code);
					btn.dataset.state = 'copied';
					if (timeout) clearTimeout(timeout);
					timeout = setTimeout(() => {
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
		void params.slug;
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
	<link rel="alternate" type="text/markdown" href="/{params.slug}.md" />
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
				class="group border-border-subtle bg-surface-raised/80 sticky top-[calc(var(--announce-h)+(--spacing(3.25)))] z-10 mb-6 rounded-lg border backdrop-blur-xl [interpolate-size:allow-keywords] details-content:overflow-clip details-content:opacity-0 details-content:[transition:opacity_0.2s_ease,block-size_0.2s_ease,content-visibility_0.2s_allow-discrete] details-content:block-0 open:details-content:opacity-100 open:details-content:block-auto lg:hidden starting:open:details-content:opacity-0 starting:open:details-content:block-0"
			>
				<summary
					class="text-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2.5 px-4 py-2.5 font-medium select-none marker:hidden"
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
							class="[transition:stroke-dashoffset_0.15s_ease]"
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
						class="text-foreground-subtle shrink-0 [transition:transform_0.15s_ease] group-open:rotate-90"
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
				</summary>
				<ul
					class="border-border-subtle border-t px-4 py-2 group-open:max-h-[calc(100vh-6rem)] group-open:overflow-y-auto group-open:overscroll-contain"
				>
					{#each data.headings as h (h.id)}
						<li>
							<a
								href="#{h.id}"
								data-sveltekit-noscroll
								onclick={() => (mobileTocOpen = false)}
								class={[
									'block truncate py-1 no-underline transition-colors',
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
				Last updated on <time datetime={data.lastModified} title={lastModifiedTitle}
					>{lastModifiedLabel}</time
				>
			</p>
		{/if}

		{#if prev || next}
			<nav
				class="border-border-subtle mt-16 grid grid-cols-1 gap-3 border-t pt-8 sm:grid-cols-2"
				aria-label="page navigation"
			>
				{#if prev}
					<a
						href="/{prev.slug}.html"
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
							>{prev.title}</span
						>
					</a>
				{:else}
					<div></div>
				{/if}
				{#if next}
					<a
						href="/{next.slug}.html"
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
							>{next.title}</span
						>
					</a>
				{/if}
			</nav>
		{/if}
	</div>

	<aside class="mr-8 w-56 shrink-0 py-8 max-lg:hidden">
		<nav class="sticky top-24">
			<button
				type="button"
				commandfor="page-actions-popover"
				command="toggle-popover"
				class="text-foreground-muted hover:text-foreground mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm no-underline transition-colors select-none"
				style="anchor-name: --page-actions-anchor;"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
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
					class={['ml-0.5 [transition:transform_0.15s_ease]', popoverOpen && 'rotate-90']}
					><path d="m9 18 6-6-6-6" /></svg
				>
			</button>
			<ul
				id="page-actions-popover"
				popover
				ontoggle={(e) => (popoverOpen = (e as ToggleEvent).newState === 'open')}
				class="border-border-subtle bg-surface-raised m-0 hidden flex-col gap-0.5 rounded-md border p-1 text-sm shadow-md open:flex"
				style="position-anchor: --page-actions-anchor; top: anchor(bottom); left: anchor(left); margin-top: 0.375rem;"
			>
				<li>
					<a
						href="/{params.slug}.md"
						data-sveltekit-reload
						class="text-foreground-muted hover:text-foreground hover:bg-surface-overlay flex w-full items-center gap-2 rounded px-2 py-1.5 no-underline transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
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
						View raw markdown
					</a>
				</li>
				<li>
					<button
						type="button"
						onclick={copyMarkdown}
						class="text-foreground-muted hover:text-foreground hover:bg-surface-overlay flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
							><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path
								d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
							/></svg
						>
						{copyState === 'copied'
							? 'Copied!'
							: copyState === 'failed'
								? 'Copy failed'
								: 'Copy as markdown'}
					</button>
				</li>
				<li>
					<button
						type="button"
						onclick={copyMarkdownUrl}
						class="text-foreground-muted hover:text-foreground hover:bg-surface-overlay flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
							><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
								d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
							/></svg
						>
						{copyUrlState === 'copied'
							? 'Copied!'
							: copyUrlState === 'failed'
								? 'Copy failed'
								: 'Copy markdown URL'}
					</button>
				</li>
				<li role="separator" aria-hidden="true" class="border-border-subtle my-1 border-t"></li>
				<li>
					<a
						href={chatgptUrl}
						target="_blank"
						rel="noopener"
						class="text-foreground-muted hover:text-foreground hover:bg-surface-overlay flex w-full items-center gap-2 rounded px-2 py-1.5 no-underline transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
							><path
								d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5093-2.6067-1.5093Z"
							/></svg
						>
						Open in ChatGPT
					</a>
				</li>
				<li>
					<a
						href={claudeUrl}
						target="_blank"
						rel="noopener"
						class="text-foreground-muted hover:text-foreground hover:bg-surface-overlay flex w-full items-center gap-2 rounded px-2 py-1.5 no-underline transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
							><path
								d="M17.3041 3.541H13.7472L20.2718 20.459H23.8287L17.3041 3.541ZM6.6959 3.541L0.1713 20.459H3.7984L5.1328 17.0019H11.9645L13.2989 20.459H16.926L10.4014 3.541H6.6959ZM6.354 13.9243L8.5486 8.2363L10.7433 13.9243H6.354Z"
							/></svg
						>
						Open in Claude
					</a>
				</li>
			</ul>
			{#if data.headings.length > 0}
				<p class="text-foreground-subtle mb-3 text-[0.7rem] font-semibold tracking-wider uppercase">
					On this page
				</p>
				<ul class="border-border-subtle border-l">
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
		</nav>
	</aside>
</div>

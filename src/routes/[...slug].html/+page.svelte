<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import './prose.css';

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
				class="group border-border-subtle bg-surface-raised sticky top-3.25 z-10 mb-6 rounded-lg border [interpolate-size:allow-keywords] details-content:overflow-clip details-content:opacity-0 details-content:[transition:opacity_0.2s_ease,block-size_0.2s_ease,content-visibility_0.2s_allow-discrete] details-content:block-0 open:details-content:opacity-100 open:details-content:block-auto lg:hidden starting:open:details-content:opacity-0 starting:open:details-content:block-0"
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
				class="text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm no-underline transition-colors"
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
			</a>
		</nav>
	</aside>
</div>

<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';

	const { data } = $props();
	const title = $derived(data.metadata.title ? `${data.metadata.title} · kit-docs` : 'kit-docs');

	let article = $state<HTMLElement>();
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
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={data.metadata.description ?? ''} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={data.metadata.description ?? ''} />
	<meta property="og:type" content="article" />
</svelte:head>

<div class="flex min-w-0">
	<div class="mx-auto max-w-3xl min-w-0 flex-1 px-4 py-8 md:px-12 md:py-12 lg:mx-0 lg:max-w-none">
		<article bind:this={article} class="prose max-w-none">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html data.html}
		</article>

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
									h.level === 3 ? 'pl-6' : 'pl-3'
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

	:global(.prose :not(pre) > code) {
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

	:global(.prose .shiki) {
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
</style>

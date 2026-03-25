<script lang="ts">
	const { data } = $props();
	const title = $derived(data.metadata.title ? `${data.metadata.title} · kit-docs` : 'kit-docs');
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={data.metadata.description ?? ''} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={data.metadata.description ?? ''} />
	<meta property="og:type" content="article" />
</svelte:head>

<div class="mx-auto flex max-w-5xl min-w-0 gap-12">
	<article class="prose max-w-[86ch] min-w-0 flex-1">
		<data.component />
	</article>

	<aside class="w-52 shrink-0 max-lg:hidden">
		<nav class="sticky top-24">
			<a
				href="/{data.slug}.md"
				data-sveltekit-reload
				class="text-foreground-muted border-border hover:bg-surface-overlay hover:text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm no-underline transition-colors"
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
				view .md
			</a>
			{#if data.headings.length > 0}
				<p class="text-foreground-muted mb-3 text-xs font-semibold tracking-widest uppercase">
					on this page
				</p>
				<ul class="space-y-1">
					{#each data.headings as h (h.id)}
						<li>
							<a
								href="#{h.id}"
								data-sveltekit-noscroll
								class={[
									'text-foreground-muted hover:text-foreground block truncate text-sm no-underline transition-colors',
									h.level === 3 ? 'pl-3' : ''
								]}>{h.text}</a
							>
						</li>
					{/each}
				</ul>
			{/if}
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
		--tw-prose-hr: var(--border);
		--tw-prose-quotes: var(--foreground);
		--tw-prose-quote-borders: var(--border);
		--tw-prose-captions: var(--foreground-muted);
		--tw-prose-code: var(--foreground);
		--tw-prose-pre-code: #ededef;
		--tw-prose-pre-bg: #161618;
		--tw-prose-th-borders: var(--border);
		--tw-prose-td-borders: var(--border);
	}

	:global(.prose h1 a[href^='#']),
	:global(.prose h2 a[href^='#']),
	:global(.prose h3 a[href^='#']) {
		color: var(--foreground-muted);
		text-decoration: none;
		opacity: 0;
		transition: opacity 0.15s;
		margin-left: 0.25em;
	}

	:global(.prose h1:hover a[href^='#']),
	:global(.prose h2:hover a[href^='#']),
	:global(.prose h3:hover a[href^='#']) {
		opacity: 1;
	}

	:global(.prose h1) {
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	:global(.prose h2) {
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	:global(.prose h3) {
		font-size: 1.125rem;
		font-weight: 600;
	}

	:global(.prose :not(pre) > code::before),
	:global(.prose :not(pre) > code::after) {
		content: none;
	}

	:global(.prose :not(pre) > code) {
		background: var(--surface-overlay);
		border: 1px solid var(--border);
		border-radius: 0.25rem;
		padding: 0.1em 0.35em;
		font-size: 0.875em;
	}

	:global(.prose pre) {
		border-radius: 0.5rem;
		border: 1px solid var(--border);
		padding: 0;
	}

	:global(.prose .shiki) {
		padding: 1em 1.5em;
		border-radius: 0.5rem;
		border: 1px solid var(--border);
		overflow-x: auto;
	}

	/* remap shiki dual-theme vars to our .dark class */
	:global(.shiki),
	:global(.shiki span) {
		color: var(--shiki-light);
		background-color: var(--shiki-light-bg);
	}

	:global(.dark .shiki),
	:global(.dark .shiki span) {
		color: var(--shiki-dark);
		background-color: var(--shiki-dark-bg);
	}

	:global(.prose a) {
		text-underline-offset: 3px;
	}
</style>

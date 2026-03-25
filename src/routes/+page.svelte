<svelte:head>
	<title>kit-docs</title>
	<meta name="description" content="Build docs that ship as static files." />
	<meta property="og:title" content="kit-docs" />
	<meta property="og:description" content="Build docs that ship as static files." />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="mx-auto max-w-2xl px-6 pt-12 pb-10 md:px-12 md:pt-20 md:pb-16">
	<span
		class="text-primary bg-primary-subtle border-primary/25 mb-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-widest uppercase"
		>sveltekit · markdown · static</span
	>
	<h1 class="text-foreground mt-0 mb-4 text-5xl leading-tight font-extrabold tracking-tighter">
		Build docs that<br />ship as static files
	</h1>
	<p class="text-foreground-muted mt-0 mb-8 max-w-[52ch] text-lg">
		Write in markdown, get a fast prerendered site. Every page available as both HTML and raw <code
			>.md</code
		>.
	</p>
	<div class="flex flex-wrap gap-3">
		<a
			href="/getting-started.html"
			class="bg-primary inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium text-white no-underline transition-opacity hover:opacity-90"
			>get started →</a
		>
		<a
			href="/getting-started.md"
			data-sveltekit-reload
			class="bg-surface-overlay text-foreground border-border hover:bg-surface-raised inline-flex items-center gap-1.5 rounded-lg border px-5 py-2.5 text-sm font-medium no-underline transition-colors"
			>view source</a
		>
	</div>
</div>

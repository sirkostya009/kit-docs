<script lang="ts">
	const { data } = $props();
	const description = 'Build docs that ship as static files.';
	const canonicalUrl = $derived(`${data.origin}/`);
	const ldScript = $derived(
		'<script type="application/ld+json">' +
			JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name: 'kit-docs',
				description,
				url: canonicalUrl,
				inLanguage: 'en',
			}) +
			'</' +
			'script>',
	);

	const cards = [
		{
			title: 'Getting started',
			description: 'Spin up a docs site in under a minute.',
			href: '/getting-started.html',
			icon: 'rocket',
		},
		{
			title: 'Configuration',
			description: 'Adapters, build options, deployment.',
			href: '/configuration.html',
			icon: 'sliders',
		},
		{
			title: 'Guides',
			description: 'Install, customize, and theme your site.',
			href: '/guides/installation.html',
			icon: 'book',
		},
		{
			title: 'Markdown showcase',
			description: 'See what renders out of the box.',
			href: '/markdown-showcase.html',
			icon: 'sparkles',
		},
	];
</script>

<svelte:head>
	<title>kit-docs · sveltekit docs starter</title>
	<link rel="canonical" href={canonicalUrl} />
	<meta name="description" content={description} />
	<meta property="og:title" content="kit-docs" />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="kit-docs" />
	<meta name="twitter:description" content={description} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html ldScript}
</svelte:head>

<article class="relative overflow-hidden px-4 py-8 md:px-12 md:py-12">
	<div
		class="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-96 bg-linear-to-b from-primary-subtle to-transparent opacity-60"
		aria-hidden="true"
	></div>

	<header class="max-w-3xl pt-10 pb-6 md:pt-14 md:pb-8">
		<p
			class="mb-5 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-raised px-3 py-1 text-xs font-medium tracking-wide text-foreground-muted"
		>
			<span aria-hidden="true" class="inline-block size-1.5 rounded-full bg-primary"></span>
			sveltekit · markdown · static
		</p>
		<h1
			class="mt-0 mb-4 text-4xl leading-[1.1] font-bold tracking-tight text-foreground md:text-5xl"
		>
			Docs that ship as<br />
			<span class="bg-linear-to-r from-primary to-primary-400 bg-clip-text text-transparent"
				>static files</span
			>
		</h1>
		<p class="mt-0 mb-6 max-w-[58ch] text-lg text-foreground-muted">
			Write in markdown. Get a fast, prerendered site. Every page available as both HTML and raw
			source.
		</p>
		<div class="flex flex-wrap gap-3">
			<a
				href="/getting-started.html"
				class="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 font-semibold text-white no-underline shadow-sm transition-colors hover:bg-primary-hover"
			>
				Get started
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</a>
			<a
				href="https://github.com/sirkostya009/kit-docs"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-5 py-2.5 font-semibold text-foreground no-underline transition-colors hover:bg-surface-overlay"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
					/>
				</svg>
				GitHub
			</a>
		</div>
	</header>

	<nav aria-label="Documentation sections" class="max-w-3xl pb-12">
		<ul class="grid list-none gap-3 p-0 sm:grid-cols-2">
			{#each cards as card (card.href)}
				<li>
					<a
						href={card.href}
						class="group relative flex h-full flex-col gap-1.5 rounded-lg border border-border bg-surface-raised p-4 no-underline transition-all hover:border-primary/40 hover:shadow-sm"
					>
						<span
							aria-hidden="true"
							class="mb-1 flex size-8 items-center justify-center rounded-lg bg-primary-subtle text-primary"
						>
							{#if card.icon === 'rocket'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
									><path
										d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
									/><path
										d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
									/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path
										d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
									/></svg
								>
							{:else if card.icon === 'sliders'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
									><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line
										x1="12"
										y1="21"
										x2="12"
										y2="12"
									/><line x1="12" y1="8" x2="12" y2="3" /><line
										x1="20"
										y1="21"
										x2="20"
										y2="16"
									/><line x1="20" y1="12" x2="20" y2="3" /><line
										x1="1"
										y1="14"
										x2="7"
										y2="14"
									/><line x1="9" y1="8" x2="15" y2="8" /><line
										x1="17"
										y1="16"
										x2="23"
										y2="16"
									/></svg
								>
							{:else if card.icon === 'book'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
									><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path
										d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
									/></svg
								>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
									><path
										d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"
									/><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path
										d="M17 19h4"
									/></svg
								>
							{/if}
						</span>
						<span class="font-semibold text-foreground">{card.title}</span>
						<span class="text-foreground-muted">{card.description}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</article>

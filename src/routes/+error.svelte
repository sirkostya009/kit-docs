<script lang="ts">
	import { page } from '$app/state';
	import NotFound from '$lib/NotFound.svelte';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Page not found' : 'Error'} · kit-docs</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if page.status === 404}
	<NotFound />
{:else}
	<article class="px-4 py-16 md:px-12 md:py-24">
		<header class="max-w-2xl">
			<p
				class="mb-5 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-raised px-3 py-1 text-xs font-medium tracking-wide text-foreground-muted"
			>
				<span aria-hidden="true" class="inline-block size-1.5 rounded-full bg-primary"></span>
				{page.status} · error
			</p>
			<h1
				class="mt-0 mb-4 text-4xl leading-[1.1] font-bold tracking-tight text-foreground md:text-5xl"
			>
				Something went wrong
			</h1>
			<p class="mt-0 mb-8 max-w-[58ch] text-lg text-foreground-muted">
				{page.error?.message ?? 'An unexpected error occurred.'}
			</p>
			<a
				href="/"
				class="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 font-semibold text-white no-underline shadow-sm transition-colors hover:bg-primary-hover"
			>
				Back to home
			</a>
		</header>
	</article>
{/if}

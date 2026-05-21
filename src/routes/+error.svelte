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
				class="border-border-subtle bg-surface-raised text-foreground-muted mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-wide"
			>
				<span aria-hidden="true" class="bg-primary inline-block size-1.5 rounded-full"></span>
				{page.status} · error
			</p>
			<h1
				class="text-foreground mt-0 mb-4 text-4xl leading-[1.1] font-bold tracking-tight md:text-5xl"
			>
				Something went wrong
			</h1>
			<p class="text-foreground-muted mt-0 mb-8 max-w-[58ch] text-lg">
				{page.error?.message ?? 'An unexpected error occurred.'}
			</p>
			<a
				href="/"
				class="bg-primary hover:bg-primary-hover inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-sm transition-colors"
			>
				Back to home
			</a>
		</header>
	</article>
{/if}

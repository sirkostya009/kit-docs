<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { nav } from '$lib/content';
	import '../app.css';

	let { children } = $props();

	type Theme = 'light' | 'dark' | 'system';
	const themes: Theme[] = ['light', 'dark', 'system'];

	let theme = $state<Theme>(
		browser ? ((localStorage.getItem('theme') as Theme) ?? 'system') : 'system'
	);

	function applyTheme(t: Theme) {
		const dark =
			t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.classList.toggle('dark', dark);
	}

	$effect(() => {
		applyTheme(theme);
		localStorage.setItem('theme', theme);

		if (theme === 'system') {
			const mq = window.matchMedia('(prefers-color-scheme: dark)');
			const handler = () => applyTheme('system');
			mq.addEventListener('change', handler);
			return () => mq.removeEventListener('change', handler);
		}
	});

	function cycleTheme() {
		theme = themes[(themes.indexOf(theme) + 1) % themes.length];
	}
</script>

<svelte:head>
	<meta property="og:site_name" content="kit-docs" />
</svelte:head>

<nav class="bg-surface border-border sticky top-0 z-50 flex h-16 items-center gap-4 border-b px-6">
	<a href="/" class="text-foreground text-[1.1rem] font-bold tracking-tight no-underline"
		>kit<span class="text-primary">docs</span></a
	>
	<div class="flex-1"></div>
	<a
		href="https://github.com/example/kit-docs"
		target="_blank"
		rel="noopener noreferrer"
		class="text-foreground-muted hover:text-foreground transition-colors"
		aria-label="GitHub"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
			/>
		</svg>
	</a>
	<button
		class="border-border text-foreground-muted hover:bg-surface-overlay hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border bg-transparent transition-colors"
		onclick={cycleTheme}
		aria-label="toggle theme"
	>
		{#if theme === 'system'}
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
			>
				<rect x="2" y="3" width="20" height="14" rx="2" /><line
					x1="8"
					y1="21"
					x2="16"
					y2="21"
				/><line x1="12" y1="17" x2="12" y2="21" />
			</svg>
		{:else if theme === 'dark'}
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
			>
				<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line
					x1="12"
					y1="21"
					x2="12"
					y2="23"
				/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line
					x1="18.36"
					y1="18.36"
					x2="19.78"
					y2="19.78"
				/><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line
					x1="4.22"
					y1="19.78"
					x2="5.64"
					y2="18.36"
				/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
			</svg>
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
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>
		{/if}
	</button>
</nav>
<div class="min-h-[calc(100vh-4rem)]">
	<aside
		class="border-border bg-surface-raised fixed top-16 h-[calc(100vh-4rem)] w-68 overflow-y-auto border-r py-6 max-md:hidden"
	>
		<div class="px-4 pb-4">
			<p class="text-foreground-muted mb-1 px-2 text-xs font-semibold tracking-widest uppercase">
				documentation
			</p>
			{#each nav as item (item.slug)}
				<a
					href="/{item.slug}.html"
					class={[
						'block rounded-md px-2 py-1.5 text-[0.9rem] no-underline transition-colors',
						page.url.pathname === resolve('/[slug].html', item)
							? 'text-primary bg-primary-subtle font-medium'
							: 'text-foreground-muted hover:text-foreground hover:bg-surface-overlay'
					]}>{item.title}</a
				>
			{/each}
		</div>
	</aside>
	<main class="p-10 pl-68">
		{@render children()}
	</main>
</div>

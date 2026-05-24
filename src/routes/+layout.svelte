<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { announcements } from '$lib/announcements';
	import { partition, type NavNode } from '$lib/nav';
	import SearchModal from '$lib/SearchModal.svelte';
	import '../app.css';

	let { data, children } = $props();
	const tree = $derived(partition(data.nav));

	function walkGroups(nodes: NavNode[], fn: (prefix: string) => void) {
		for (const n of nodes) {
			if (n.kind === 'group') {
				fn(n.prefix);
				walkGroups(n.children, fn);
			}
		}
	}

	const openGroups = $state<Record<string, boolean>>({});
	// svelte-ignore state_referenced_locally
	walkGroups(tree.groups, (prefix) => {
		openGroups[prefix] = page.url.pathname.startsWith(`/${prefix}/`);
	});

	$effect(() => {
		const path = page.url.pathname;
		walkGroups(tree.groups, (prefix) => {
			if (path.startsWith(`/${prefix}/`)) openGroups[prefix] = true;
		});
	});

	const DISMISSED_KEY = 'announcements-dismissed';
	let dismissedIds = $state<string[]>(
		browser ? (JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') as string[]) : [],
	);
	const visibleAnnouncements = $derived(announcements.filter((a) => !dismissedIds.includes(a.id)));

	function dismissAnnouncement(id: string) {
		dismissedIds = [...dismissedIds, id];
		localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedIds));
	}

	$effect(() => {
		document.documentElement.style.setProperty(
			'--announce-h',
			visibleAnnouncements.length ? `calc(${visibleAnnouncements.length} * 2.5rem)` : '0px',
		);
	});

	type Theme = 'light' | 'dark' | 'system';
	const themes: Theme[] = ['light', 'dark', 'system'];

	let theme = $state<Theme>(
		browser ? ((localStorage.getItem('theme') as Theme) ?? 'system') : 'system',
	);

	let sidebarOpen = $state(false);
	let searchOpen = $state(false);
	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl';
	let sidebarCollapsed = $state(
		browser ? localStorage.getItem('sidebar-collapsed') === 'true' : false,
	);

	$effect(() => {
		localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
		document.documentElement.classList.toggle('sidebar-collapsed', sidebarCollapsed);
	});

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

	$effect(() => {
		void page.url;
		sidebarOpen = false;
	});

	function cycleTheme() {
		theme = themes[(themes.indexOf(theme) + 1) % themes.length];
	}

	$effect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				searchOpen = !searchOpen;
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

{#snippet navLink(item: { slug: string; title: string }, onclick?: () => void)}
	{@const active = page.url.pathname === resolve('/[...slug].html', item)}
	<a
		href="/{item.slug}.html"
		{onclick}
		aria-current={active ? 'page' : undefined}
		class={[
			'block rounded-md px-4 py-2.5 no-underline transition-colors md:px-3 md:py-1.5 md:text-sm',
			active
				? 'text-primary bg-primary-subtle font-medium'
				: 'text-foreground-muted hover:text-foreground hover:bg-surface-overlay',
		]}
	>
		{item.title}
	</a>
{/snippet}

{#snippet navNodes(items: NavNode[], onclick?: () => void)}
	{#each items as node (node.kind === 'leaf' ? node.slug : node.prefix)}
		{#if node.kind === 'leaf'}
			{@render navLink(node, onclick)}
		{:else}
			<details class="nav-group" bind:open={openGroups[node.prefix]}>
				<summary
					class="text-foreground-muted hover:text-foreground hover:bg-surface-overlay flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2.5 transition-colors select-none md:px-3 md:py-1.5 md:text-sm"
				>
					<span class="capitalize">{node.name.replace(/-/g, ' ')}</span>
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
						class="nav-chevron text-foreground-subtle ml-auto transition-transform"
						aria-hidden="true"
					>
						<polyline points="9 18 15 12 9 6" />
					</svg>
				</summary>
				<div
					class="after:bg-border-subtle relative pr-1 after:absolute after:top-0 after:right-4.5 after:bottom-0 after:w-px after:content-['']"
				>
					{@render navNodes(node.children, onclick)}
				</div>
			</details>
		{/if}
	{/each}
{/snippet}

{#snippet navTree(onclick?: () => void)}
	{#each tree.top as item (item.slug)}
		{@render navLink(item, onclick)}
	{/each}
	{#each tree.groups as group (group.prefix)}
		<details class="nav-group mt-4" bind:open={openGroups[group.prefix]}>
			<summary
				class="text-foreground-muted hover:text-foreground hover:bg-surface-overlay mb-1 flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2.5 font-bold capitalize transition-colors select-none md:px-3 md:py-1.5 md:text-sm"
			>
				{group.name.replace(/-/g, ' ')}
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
					class="nav-chevron text-foreground-subtle ml-auto transition-transform"
					aria-hidden="true"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</summary>
			<div
				class="after:bg-border-subtle relative pr-1 after:absolute after:top-0 after:right-4.5 after:bottom-0 after:w-px after:content-['']"
			>
				{@render navNodes(group.children, onclick)}
			</div>
		</details>
	{/each}
{/snippet}

{#snippet logo()}
	<a
		href="/"
		class="text-foreground inline-flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight no-underline"
	>
		<span class="bg-primary inline-block size-5 rounded-md"></span>
		kit<span class="text-foreground-muted font-normal">docs</span>
	</a>
{/snippet}

{#snippet themeButton()}
	<button
		class="text-foreground-muted hover:bg-surface-overlay hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-transparent transition-colors"
		onclick={cycleTheme}
		aria-label="toggle theme ({theme})"
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
				<rect x="2" y="3" width="20" height="14" rx="2" />
				<line x1="8" y1="21" x2="16" y2="21" />
				<line x1="12" y1="17" x2="12" y2="21" />
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
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
				<circle cx="12" cy="12" r="5" />
				<line x1="12" y1="1" x2="12" y2="3" />
				<line x1="12" y1="21" x2="12" y2="23" />
				<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
				<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
				<line x1="1" y1="12" x2="3" y2="12" />
				<line x1="21" y1="12" x2="23" y2="12" />
				<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
				<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
			</svg>
		{/if}
	</button>
{/snippet}

<svelte:head>
	<meta property="og:site_name" content="kit-docs" />
</svelte:head>

{#if visibleAnnouncements.length}
	<div
		role="region"
		aria-label="Site announcements"
		class="fixed top-0 right-0 left-0 z-50 flex flex-col"
	>
		{#each visibleAnnouncements as announcement (announcement.id)}
			<div
				class="bg-primary-600 dark:bg-primary-800 border-b-primary-700 dark:border-b-primary-900 h-10 border-b text-white last:border-b-0"
			>
				<div class="mx-auto flex h-full max-w-(--layout-width) items-center gap-3 px-4">
					<p class="truncate font-medium">
						{announcement.text}
						{#if announcement.href}
							<a class="ml-1 underline underline-offset-2" href={announcement.href}>Learn more →</a>
						{/if}
					</p>
					<button
						type="button"
						onclick={() => dismissAnnouncement(announcement.id)}
						class="hover:bg-primary-700 dark:hover:bg-primary-900 ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-transparent transition-colors"
						aria-label="Dismiss announcement"
					>
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
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<header
	class="bg-surface/80 border-border fixed right-0 bottom-0 left-0 z-40 border-t backdrop-blur-xl md:hidden"
>
	<div class="flex h-14 items-center gap-3 px-4">
		<button
			class="text-foreground-muted hover:bg-surface-overlay hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-transparent transition-colors"
			onclick={() => (sidebarOpen = !sidebarOpen)}
			aria-label="toggle sidebar"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{#if sidebarOpen}
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				{:else}
					<line x1="4" y1="6" x2="20" y2="6" />
					<line x1="4" y1="12" x2="20" y2="12" />
					<line x1="4" y1="18" x2="20" y2="18" />
				{/if}
			</svg>
		</button>
		{@render logo()}
		<div class="ml-auto flex items-center gap-1">
			<button
				class="text-foreground-muted hover:bg-surface-overlay hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-transparent transition-colors"
				onclick={() => (searchOpen = true)}
				aria-label="search"
			>
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
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
			</button>
			{@render themeButton()}
		</div>
	</div>
</header>

<aside
	class="fixed top-(--announce-h) bottom-0 left-0 z-30 hidden w-(--sidebar-shelf) justify-end overflow-hidden bg-(--sidebar) transition-[width] duration-200 ease-out md:flex"
>
	<div
		class={[
			'border-border-subtle flex h-full w-64 shrink-0 flex-col gap-3 border-r p-4 transition-opacity duration-150',
			sidebarCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
		]}
	>
		<div class="flex items-center gap-2 px-1">
			{@render logo()}
			<button
				class="text-foreground-muted hover:bg-surface-overlay hover:text-foreground ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-transparent transition-colors"
				onclick={() => (sidebarCollapsed = true)}
				aria-label="collapse sidebar"
				title="collapse sidebar"
			>
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
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<path d="M9 3v18" />
					<path d="m16 15-3-3 3-3" />
				</svg>
			</button>
		</div>
		<button
			type="button"
			onclick={() => (searchOpen = true)}
			class="border-border bg-surface-raised text-foreground-subtle hover:bg-surface-overlay flex h-11 w-full cursor-text items-center gap-2 rounded-md border pr-2 pl-3 transition-colors md:h-9 md:text-sm"
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
				><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg
			>
			<span class="flex-1 text-start">Search</span>
			<kbd
				class="border-border bg-surface text-foreground-subtle rounded border px-1.5 py-0.5 font-mono text-[0.65rem]"
				>{modKey} K</kbd
			>
		</button>
		<nav class="-mx-1 flex-1 overflow-y-auto pt-2">
			<p
				class="text-foreground-subtle mt-1 mb-2 px-3 text-[0.7rem] font-semibold tracking-wider uppercase"
			>
				Documentation
			</p>
			{@render navTree()}
		</nav>
		<div
			class="border-border bg-surface-raised text-foreground-muted flex items-center rounded-lg border p-0.5"
		>
			<a
				href="https://github.com/sirkostya009/kit-docs"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:bg-surface-overlay hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors"
				aria-label="GitHub"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
					/>
				</svg>
			</a>
			<div class="border-border ml-auto h-5 self-center border-l"></div>
			{@render themeButton()}
		</div>
	</div>
</aside>

<div
	class={[
		'fixed top-[calc(var(--announce-h)+1rem)] left-4 z-40 hidden gap-2 transition-[opacity,transform] duration-200 ease-out md:flex',
		sidebarCollapsed
			? 'translate-x-0 opacity-100 delay-150'
			: 'pointer-events-none -translate-x-2 opacity-0',
	]}
>
	<button
		class="bg-surface-raised border-border text-foreground-muted hover:bg-surface-overlay hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border shadow-sm transition-colors"
		onclick={() => (sidebarCollapsed = false)}
		aria-label="expand sidebar"
		title="expand sidebar"
	>
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
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M9 3v18" />
			<path d="m13 15 3-3-3-3" />
		</svg>
	</button>
	<button
		class="bg-surface-raised border-border text-foreground-muted hover:bg-surface-overlay hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border shadow-sm transition-colors"
		onclick={() => (searchOpen = true)}
		aria-label="search"
		title="search"
	>
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
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	</button>
</div>

{#if sidebarOpen}
	<aside
		class="bg-surface fixed top-(--announce-h) right-0 bottom-14 left-0 z-50 flex flex-col gap-3 overflow-y-auto p-4 md:hidden"
	>
		<nav class="-mx-1 flex-1 overflow-y-auto pt-2">
			<p
				class="text-foreground-subtle mt-1 mb-2 px-3 text-[0.7rem] font-semibold tracking-wider uppercase"
			>
				Documentation
			</p>
			{@render navTree(() => (sidebarOpen = false))}
		</nav>
	</aside>
{/if}

<div
	class="mx-auto flex min-h-screen max-w-(--layout-width) pt-(--announce-h) pb-14 pl-(--sidebar-w) transition-[padding] duration-200 ease-out md:pb-0"
>
	<main class="w-full min-w-0 flex-1">
		{@render children()}
	</main>
</div>

<SearchModal bind:open={searchOpen} />

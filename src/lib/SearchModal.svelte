<script lang="ts">
	import { goto } from '$app/navigation';
	import MiniSearch, { type SearchResult } from 'minisearch';

	type Heading = { id: string; text: string };
	type Stored = {
		slug: string;
		section: string;
		title: string;
		description: string;
		headings: Heading[];
		content: string;
	};
	type Result = SearchResult & Stored & { snippet: string; matchedHeading?: Heading };

	const MINI_OPTIONS = {
		idField: 'id',
		fields: ['title', 'headingsText', 'description', 'content'],
		storeFields: ['slug', 'section', 'title', 'description', 'headings', 'content'],
	};
	const RECENT_KEY = 'kit-docs:recent-searches';
	const RECENT_MAX = 5;
	const CLOSE_MS = 70;

	let { open = $bindable(false) } = $props();

	let query = $state('');
	let mini = $state<MiniSearch>();
	let sections = $state<string[]>([]);
	let activeSection = $state<string | null>(null);
	let recent = $state<string[]>([]);
	let selected = $state(0);
	let input = $state<HTMLInputElement>();
	let dialog = $state<HTMLDialogElement>();
	let closing = $state(false);

	async function loadIndex() {
		if (mini) return;
		const res = await fetch('/search-index.json');
		const data = await res.json();
		sections = data.sections;
		mini = MiniSearch.loadJS(data.index, MINI_OPTIONS);
	}

	function loadRecent() {
		try {
			const raw = localStorage.getItem(RECENT_KEY);
			if (raw) recent = JSON.parse(raw).slice(0, RECENT_MAX);
		} catch {
			recent = [];
		}
	}

	function pushRecent(q: string) {
		const trimmed = q.trim();
		if (!trimmed) return;
		recent = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, RECENT_MAX);
		try {
			localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
		} catch {
			// ignore
		}
	}

	function clearRecent() {
		recent = [];
		try {
			localStorage.removeItem(RECENT_KEY);
		} catch {
			// ignore
		}
	}

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			closing = false;
			dialog.showModal();
			loadIndex();
			loadRecent();
			queueMicrotask(() => input?.focus());
		} else if (!open && dialog.open && !closing) {
			closing = true;
			setTimeout(() => {
				dialog?.close();
				closing = false;
				query = '';
				selected = 0;
				activeSection = null;
			}, CLOSE_MS);
		}
	});

	function onCancel(e: Event) {
		e.preventDefault();
		open = false;
	}

	function onClick(e: MouseEvent) {
		if (e.target === dialog) open = false;
	}

	const results = $derived.by<Result[]>(() => {
		if (!mini) return [];
		const q = query.trim();
		if (!q) return [];
		const raw = mini.search(q, {
			fuzzy: 0.2,
			prefix: true,
			boost: { title: 3, headingsText: 2 },
			filter: activeSection ? (r) => r.section === activeSection : undefined,
		}) as Array<SearchResult & Stored>;

		return raw.slice(0, 10).map((r) => {
			const terms: string[] = (r.terms ?? []).map((t: string) => t.toLowerCase());
			const lowerContent = r.content.toLowerCase();
			let snippetIdx = -1;
			for (const t of terms) {
				const idx = lowerContent.indexOf(t);
				if (idx >= 0) {
					snippetIdx = idx;
					break;
				}
			}
			const snippet =
				snippetIdx >= 0
					? r.content.slice(Math.max(0, snippetIdx - 40), snippetIdx + 80)
					: r.description;

			let matchedHeading: Heading | undefined;
			for (const h of r.headings) {
				const hl = h.text.toLowerCase();
				if (terms.some((t) => hl.includes(t))) {
					matchedHeading = h;
					break;
				}
			}

			return { ...r, snippet, matchedHeading };
		});
	});

	function resultHref(r: Result) {
		return r.matchedHeading ? `/${r.slug}.html#${r.matchedHeading.id}` : `/${r.slug}.html`;
	}

	function go(href: string, q?: string) {
		if (q !== undefined) pushRecent(q);
		open = false;
		goto(href);
	}

	const showingRecent = $derived(!query.trim() && recent.length > 0);
	const navLength = $derived(showingRecent ? recent.length : results.length);

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selected = Math.min(selected + 1, navLength - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selected = Math.max(selected - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (showingRecent) {
				const q = recent[selected];
				if (q) {
					query = q;
					selected = 0;
				}
			} else {
				const r = results[selected];
				if (r) go(resultHref(r), query);
			}
		}
	}

	function highlight(text: string, q: string) {
		if (!q) return text;
		const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
		if (terms.length === 0) return text;
		const pattern = new RegExp(
			'(' + terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
			'gi',
		);
		return text.replace(pattern, '<mark>$1</mark>');
	}
</script>

<dialog
	bind:this={dialog}
	oncancel={onCancel}
	onclick={onClick}
	data-closing={closing}
	class="
		bg-surface-raised border-border mx-auto mt-[10vh] mb-auto w-full max-w-xl rounded-lg border p-0 shadow-2xl
		transition-[opacity,transform] duration-75 ease-out

		backdrop:bg-black/30 backdrop:transition-colors backdrop:duration-75
		backdrop:ease-out data-[closing=true]:-translate-y-2 data-[closing=true]:scale-[0.97]
		data-[closing=true]:opacity-0 data-[closing=true]:backdrop:bg-transparent starting:open:-translate-y-2 starting:open:scale-[0.97]
		starting:open:opacity-0
		starting:open:backdrop:bg-transparent
	"
>
	<div class="border-border-subtle flex items-center gap-3 border-b px-4">
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
			class="text-foreground-subtle"
			aria-hidden="true"
			><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg
		>
		<input
			bind:this={input}
			bind:value={query}
			oninput={() => (selected = 0)}
			onkeydown={onKey}
			type="text"
			placeholder="Search docs..."
			class="text-foreground placeholder:text-foreground-subtle h-12 flex-1 bg-transparent text-base outline-none"
		/>
		<kbd
			class="border-border bg-surface text-foreground-subtle hidden rounded border px-1.5 py-0.5 font-mono text-[0.65rem] sm:inline"
			>Esc</kbd
		>
	</div>

	{#if sections.length > 0 && query.trim()}
		<div
			class="border-border-subtle flex flex-wrap items-center gap-1.5 border-b px-4 py-2"
			role="tablist"
			aria-label="Filter by section"
		>
			<button
				type="button"
				role="tab"
				aria-selected={activeSection === null}
				onclick={() => {
					activeSection = null;
					selected = 0;
				}}
				class={[
					'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
					activeSection === null
						? 'border-primary bg-primary-subtle text-primary'
						: 'border-border text-foreground-muted hover:bg-surface-overlay',
				]}>All</button
			>
			{#each sections as s (s)}
				<button
					type="button"
					role="tab"
					aria-selected={activeSection === s}
					onclick={() => {
						activeSection = s;
						selected = 0;
					}}
					class={[
						'rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors',
						activeSection === s
							? 'border-primary bg-primary-subtle text-primary'
							: 'border-border text-foreground-muted hover:bg-surface-overlay',
					]}>{s.replace(/-/g, ' ')}</button
				>
			{/each}
		</div>
	{/if}

	<div class="max-h-[60vh] overflow-y-auto p-2">
		{#if !mini}
			<p class="text-foreground-subtle px-3 py-6 text-center">Loading…</p>
		{:else if !query.trim()}
			{#if recent.length > 0}
				<div class="flex items-center justify-between px-3 pt-2 pb-1">
					<span class="text-foreground-subtle text-xs font-medium tracking-wide uppercase"
						>Recent</span
					>
					<button
						type="button"
						onclick={clearRecent}
						class="text-foreground-subtle hover:text-foreground text-xs underline-offset-2 hover:underline"
						>Clear</button
					>
				</div>
				<ul class="flex flex-col gap-0.5" role="listbox">
					{#each recent as q, i (q + i)}
						<li>
							<button
								type="button"
								onclick={() => {
									query = q;
									selected = 0;
									input?.focus();
								}}
								onmouseenter={() => (selected = i)}
								aria-selected={selected === i}
								role="option"
								class={[
									'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors',
									selected === i
										? 'bg-primary-subtle text-primary'
										: 'text-foreground hover:bg-surface-overlay',
								]}
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
									class="text-foreground-subtle shrink-0"
									aria-hidden="true"
									><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg
								>
								<span class="truncate">{q}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-foreground-subtle px-3 py-6 text-center">Start typing to search.</p>
			{/if}
		{:else if results.length === 0}
			<p class="text-foreground-subtle px-3 py-6 text-center">
				No results for &quot;{query}&quot;.
			</p>
		{:else}
			<ul class="flex flex-col gap-0.5" role="listbox">
				{#each results as r, i (r.slug + i)}
					<li>
						<a
							href={resultHref(r)}
							onclick={(e) => {
								e.preventDefault();
								go(resultHref(r), query);
							}}
							onmouseenter={() => (selected = i)}
							class={[
								'group block rounded-md px-3 py-2 no-underline transition-colors',
								selected === i
									? 'bg-primary-subtle text-primary'
									: 'text-foreground hover:bg-surface-overlay',
							]}
							role="option"
							aria-selected={selected === i}
						>
							<div class="flex items-center gap-2 font-medium">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html highlight(r.title, query)}
								{#if r.matchedHeading}
									<span class="text-foreground-subtle text-xs">›</span>
									<span class="text-foreground-muted text-xs">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html highlight(r.matchedHeading.text, query)}
									</span>
								{/if}
								{#if r.section}
									<span
										class="text-foreground-subtle border-border ml-auto rounded border px-1.5 py-0.5 text-[0.65rem] capitalize"
										>{r.section.replace(/-/g, ' ')}</span
									>
								{/if}
							</div>
							{#if r.snippet}
								<p class="text-foreground-muted mt-0.5 line-clamp-1 text-xs">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html highlight(r.snippet, query)}
								</p>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div
		class="border-border-subtle text-foreground-subtle hidden items-center gap-4 border-t px-4 py-2 text-[0.65rem] sm:flex"
	>
		<span class="flex items-center gap-1">
			<kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">↵</kbd>
			to open
		</span>
		<span class="flex items-center gap-1">
			<kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">↑</kbd>
			<kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">↓</kbd>
			to navigate
		</span>
		<span class="flex items-center gap-1">
			<kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">Esc</kbd>
			to close
		</span>
	</div>
</dialog>

<style>
	:global(mark) {
		background: color-mix(in oklab, var(--primary) 25%, transparent);
		color: inherit;
		border-radius: 0.125rem;
		padding: 0 0.1em;
	}
</style>

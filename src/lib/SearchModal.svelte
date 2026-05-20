<script lang="ts">
	import { goto } from '$app/navigation';

	type Heading = { id: string; text: string };
	type Doc = {
		slug: string;
		title: string;
		description: string;
		headings: Heading[];
		content: string;
	};
	type Result = Doc & { score: number; snippet: string; matchedHeading?: Heading };

	let { open = $bindable(false) } = $props();

	let query = $state('');
	let index = $state<Doc[]>();
	let selected = $state(0);
	let input = $state<HTMLInputElement>();
	let dialog = $state<HTMLDialogElement>();
	let closing = $state(false);

	const CLOSE_MS = 70;

	async function loadIndex() {
		if (index) return;
		const res = await fetch('/search-index.json');
		index = await res.json();
	}

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			closing = false;
			dialog.showModal();
			loadIndex();
			queueMicrotask(() => input?.focus());
		} else if (!open && dialog.open && !closing) {
			closing = true;
			setTimeout(() => {
				dialog?.close();
				closing = false;
				query = '';
				selected = 0;
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

	const results = $derived.by(() => {
		if (!index) return [];
		const q = query.toLowerCase().trim();
		if (!q) return [];
		const terms = q.split(/\s+/);
		const out: Result[] = [];
		for (const doc of index) {
			let score = 0;
			const title = doc.title.toLowerCase();
			const content = doc.content.toLowerCase();
			let bestHeading: Heading | undefined;
			let bestHeadingScore = 0;
			let snippetIdx = -1;

			for (const t of terms) {
				if (title.includes(t)) score += 100;
				if (title.startsWith(t)) score += 30;

				for (const h of doc.headings) {
					const hl = h.text.toLowerCase();
					if (hl.includes(t)) {
						score += 40;
						if (40 > bestHeadingScore) {
							bestHeadingScore = 40;
							bestHeading = h;
						}
					}
				}

				const idx = content.indexOf(t);
				if (idx >= 0) {
					score += 10;
					if (snippetIdx < 0) snippetIdx = idx;
				}
			}

			if (score > 0) {
				const snippet =
					snippetIdx >= 0
						? doc.content.slice(Math.max(0, snippetIdx - 40), snippetIdx + 80)
						: doc.description;
				out.push({ ...doc, score, snippet, matchedHeading: bestHeading });
			}
		}
		return out.sort((a, b) => b.score - a.score).slice(0, 10);
	});

	function resultHref(r: Result) {
		return r.matchedHeading ? `/${r.slug}.html#${r.matchedHeading.id}` : `/${r.slug}.html`;
	}

	function go(href: string) {
		open = false;
		goto(href);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selected = Math.min(selected + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selected = Math.max(selected - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const r = results[selected];
			if (r) go(resultHref(r));
		}
	}

	function highlight(text: string, q: string) {
		if (!q) return text;
		const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
		if (terms.length === 0) return text;
		const pattern = new RegExp(
			'(' + terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
			'gi'
		);
		return text.replace(pattern, '<mark>$1</mark>');
	}
</script>

<dialog
	bind:this={dialog}
	oncancel={onCancel}
	onclick={onClick}
	data-closing={closing}
	class="bg-surface-raised border-border w-full max-w-xl rounded-lg border p-0 shadow-2xl"
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
			class="text-foreground placeholder:text-foreground-subtle h-12 flex-1 bg-transparent text-sm outline-none"
		/>
		<kbd
			class="border-border bg-surface text-foreground-subtle hidden rounded border px-1.5 py-0.5 font-mono text-[0.65rem] sm:inline"
			>Esc</kbd
		>
	</div>

	<div class="max-h-[60vh] overflow-y-auto p-2">
		{#if !index}
			<p class="text-foreground-subtle px-3 py-6 text-center text-sm">Loading…</p>
		{:else if !query.trim()}
			<p class="text-foreground-subtle px-3 py-6 text-center text-sm">Start typing to search.</p>
		{:else if results.length === 0}
			<p class="text-foreground-subtle px-3 py-6 text-center text-sm">
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
								go(resultHref(r));
							}}
							onmouseenter={() => (selected = i)}
							class={[
								'group block rounded-md px-3 py-2 no-underline transition-colors',
								selected === i
									? 'bg-primary-subtle text-primary'
									: 'text-foreground hover:bg-surface-overlay'
							]}
							role="option"
							aria-selected={selected === i}
						>
							<div class="flex items-center gap-2 text-sm font-medium">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html highlight(r.title, query)}
								{#if r.matchedHeading}
									<span class="text-foreground-subtle text-xs">›</span>
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									<span class="text-foreground-muted text-xs">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html highlight(r.matchedHeading.text, query)}
									</span>
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
</dialog>

<style>
	:global(mark) {
		background: color-mix(in oklab, var(--primary) 25%, transparent);
		color: inherit;
		border-radius: 0.125rem;
		padding: 0 0.1em;
	}
</style>

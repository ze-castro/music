<script lang="ts">
  import { Check, Search, X } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { enhance } from '$app/forms';
  import Artwork from '$lib/components/Artwork.svelte';
  import { cmpName } from '$lib/sort';
  import { fmtTime } from '$lib/utils';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  type Sort = 'recent' | 'az' | 'za';
  const sorts: [Sort, string][] = [
    ['recent', 'Recently added'],
    ['az', 'A–Z'],
    ['za', 'Z–A'],
  ];

  let q = $state('');
  let sort = $state<Sort>('recent');
  let limit = $state(200);
  let submitting = $state(false);
  const selected = new SvelteSet<string>();

  const inPlaylist = $derived(new Set(data.existingIds));

  const filtered = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? data.library.filter(
          (t) =>
            t.title.toLowerCase().includes(needle) ||
            (t.artist ?? '').toLowerCase().includes(needle) ||
            (t.album ?? '').toLowerCase().includes(needle),
        )
      : [...data.library];
    if (sort === 'az') list.sort((a, b) => cmpName(a.title, b.title));
    else if (sort === 'za') list.sort((a, b) => cmpName(b.title, a.title));
    else list.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
    return list;
  });
  const visible = $derived(filtered.slice(0, limit));

  // Reset the window whenever the result set changes.
  $effect(() => {
    q;
    sort;
    limit = 200;
  });

  function toggle(id: string) {
    if (inPlaylist.has(id)) return;
    selected.has(id) ? selected.delete(id) : selected.add(id);
  }
  function selectShown() {
    for (const t of visible) if (!inPlaylist.has(t.id)) selected.add(t.id);
  }
</script>

<svelte:head><title>Edit {data.name} · Music</title></svelte:head>

<div class="p-4 md:p-6" class:pb-24={selected.size > 0}>
  <div class="mb-4 flex items-start justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <Artwork coverArt={data.coverArt} name={data.name} size={200} class="h-14 w-14 shrink-0" />
      <div class="min-w-0">
        <div class="text-xs uppercase tracking-wide text-muted-foreground">Add songs to</div>
        <h1 class="truncate text-xl font-semibold tracking-tight">{data.name}</h1>
        <div class="text-xs text-muted-foreground">{data.existingIds.length} songs in playlist</div>
      </div>
    </div>
    <a
      href="/playlists/{data.id}"
      class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-accent"
      ><X size={16} />Done</a
    >
  </div>

  <div class="mb-3 flex flex-col gap-3">
    <div class="relative">
      <Search
        size={14}
        class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        bind:value={q}
        placeholder="Search your library"
        autocomplete="off"
        autocapitalize="off"
        class="h-9 w-full rounded-md border bg-transparent pl-8 pr-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
    <div class="flex items-center justify-between gap-2">
      <div class="scroll-x -mx-4 flex gap-1 overflow-x-auto px-4 text-sm md:mx-0 md:px-0">
        {#each sorts as [k, label]}
          <button
            onclick={() => (sort = k)}
            class="shrink-0 whitespace-nowrap rounded-md px-2 py-1 {sort === k
              ? 'bg-accent'
              : 'text-muted-foreground hover:bg-accent/60'}">{label}</button
          >
        {/each}
      </div>
      <button
        onclick={selectShown}
        class="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent/60"
        >Select shown</button
      >
    </div>
  </div>

  {#if filtered.length === 0}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      No songs match “{q}”.
    </p>
  {:else}
    <ol class="divide-y">
      {#each visible as t (t.id)}
        {@const already = inPlaylist.has(t.id)}
        {@const picked = selected.has(t.id)}
        <li>
          <button
            onclick={() => toggle(t.id)}
            disabled={already}
            class="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-accent/60 disabled:opacity-50 disabled:hover:bg-transparent"
            aria-pressed={picked}
          >
            <span
              class="grid h-5 w-5 shrink-0 place-items-center rounded-full border {picked
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/50'}"
            >
              {#if picked || already}<Check size={12} />{/if}
            </span>
            <Artwork
              coverArt={t.coverArt}
              name={t.album ?? t.title}
              size={100}
              class="h-10 w-10 shrink-0"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm">{t.title}</span>
              <span class="block truncate text-xs text-muted-foreground"
                >{t.artist}{#if t.album}<span aria-hidden="true"> · </span>{t.album}{/if}</span
              >
            </span>
            <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
              {already ? 'Added' : fmtTime(t.duration)}
            </span>
          </button>
        </li>
      {/each}
    </ol>
    {#if filtered.length > visible.length}
      <button
        onclick={() => (limit += 200)}
        class="mt-4 h-9 w-full rounded-md border text-sm hover:bg-accent"
        >Show more ({filtered.length - visible.length} left)</button
      >
    {/if}
  {/if}

  {#if selected.size > 0}
    <form
      method="POST"
      action="?/add"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          selected.clear();
          await update({ reset: false });
        };
      }}
      class="fixed inset-x-3 z-50 mx-auto flex max-w-md items-center gap-2 rounded-full border bg-card/80 p-1.5 pl-4 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/70 md:inset-x-6 md:max-w-lg"
      style="bottom: calc(var(--bottom-stack, 6.5rem) + 0.75rem)"
    >
      {#each [...selected] as id (id)}
        <input type="hidden" name="songId" value={id} />
      {/each}
      <span class="min-w-0 flex-1 truncate text-sm text-muted-foreground"
        >{selected.size} selected</span
      >
      <button
        type="button"
        onclick={() => selected.clear()}
        class="h-9 shrink-0 rounded-full px-3 text-sm text-muted-foreground active:bg-accent"
        >Clear</button
      >
      <button
        type="submit"
        disabled={submitting}
        class="h-9 shrink-0 rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >{submitting ? 'Adding…' : 'Add'}</button
      >
    </form>
  {/if}
</div>

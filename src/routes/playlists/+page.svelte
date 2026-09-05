<script lang="ts">
  import { Heart } from '@lucide/svelte';
  import Artwork from '$lib/components/Artwork.svelte';
  import ListHeader from '$lib/components/ListHeader.svelte';
  import { cmpName } from '$lib/sort';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  type Sort = 'changed' | 'az' | 'za';
  let q = $state('');
  let sort = $state<Sort>('changed');
  const sorts: [Sort, string][] = [
    ['changed', 'Recently updated'],
    ['az', 'A–Z'],
    ['za', 'Z–A'],
  ];

  const shown = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? data.playlists.filter((p) => p.name.toLowerCase().includes(needle))
      : [...data.playlists];
    const byName = (a: { name: string }, b: { name: string }) => cmpName(a.name, b.name);
    if (sort === 'az') list.sort(byName);
    else if (sort === 'za') list.sort((a, b) => byName(b, a));
    else list.sort((a, b) => b.changed.localeCompare(a.changed));
    return list;
  });
  const showLiked = $derived(!q.trim() || 'liked songs'.includes(q.trim().toLowerCase()));
</script>

<svelte:head><title>Playlists · Music</title></svelte:head>

<div class="p-4 md:p-6">
  <ListHeader
    title="Playlists"
    count={shown.length + (showLiked ? 1 : 0)}
    placeholder="Filter playlists"
    bind:q
    bind:sort
    {sorts}
  />

  {#if !showLiked && shown.length === 0}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      No playlists match “{q}”.
    </p>
  {:else}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {#if showLiked}
        <a href="/playlists/liked" class="block">
          <div
            class="grid aspect-square place-items-center rounded-md bg-gradient-to-br from-zinc-600 to-zinc-800"
          >
            <Heart size={48} class="text-white/90" fill="currentColor" />
          </div>
          <div class="mt-2 truncate text-sm font-medium">Liked Songs</div>
          <div class="text-xs text-muted-foreground">{data.likedCount} songs</div>
        </a>
      {/if}
      {#each shown as p (p.id)}
        <a href="/playlists/{p.id}" class="block">
          <Artwork coverArt={p.coverArt} name={p.name} size={400} />
          <div class="mt-2 truncate text-sm font-medium">{p.name}</div>
          <div class="truncate text-xs text-muted-foreground">{p.songCount} songs</div>
        </a>
      {/each}
    </div>
    {#if data.playlists.length === 0}
      <p class="mt-6 rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No playlists yet. Create one in Navidrome.
      </p>
    {/if}
  {/if}
</div>

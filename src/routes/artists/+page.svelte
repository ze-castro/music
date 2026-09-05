<script lang="ts">
  import Artwork from '$lib/components/Artwork.svelte';
  import ListHeader from '$lib/components/ListHeader.svelte';
  import { cmpName } from '$lib/sort';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  type Sort = 'az' | 'za' | 'albums';
  let q = $state('');
  let sort = $state<Sort>('az');
  const sorts: [Sort, string][] = [
    ['az', 'A–Z'],
    ['za', 'Z–A'],
    ['albums', 'Most albums'],
  ];

  const shown = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? data.artists.filter((a) => a.name.toLowerCase().includes(needle))
      : [...data.artists];
    const byName = (a: { name: string }, b: { name: string }) => cmpName(a.name, b.name);
    if (sort === 'az') list.sort(byName);
    else if (sort === 'za') list.sort((a, b) => byName(b, a));
    else list.sort((a, b) => (b.albumCount ?? 0) - (a.albumCount ?? 0) || byName(a, b));
    return list;
  });
</script>

<svelte:head><title>Artists · Music</title></svelte:head>

<div class="p-4 md:p-6">
  <ListHeader
    title="Artists"
    count={shown.length}
    placeholder="Filter artists"
    bind:q
    bind:sort
    {sorts}
  />

  {#if shown.length === 0}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      No artists match “{q}”.
    </p>
  {:else}
    <div class="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
      {#each shown as a (a.id)}
        <a href="/artists/{a.id}" class="block">
          <Artwork coverArt={a.coverArt} name={a.name} size={400} class="rounded-full" />
          <div class="mt-2 truncate text-center text-sm font-medium">{a.name}</div>
          <div class="truncate text-center text-xs text-muted-foreground">
            {a.albumCount} album{a.albumCount === 1 ? '' : 's'}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

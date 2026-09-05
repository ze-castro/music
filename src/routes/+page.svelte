<script lang="ts">
  import AlbumCard from '$lib/components/AlbumCard.svelte';
  import ListHeader from '$lib/components/ListHeader.svelte';
  import { cmpName } from '$lib/sort';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  type Sort = 'recent' | 'az' | 'za' | 'played';
  let q = $state('');
  let sort = $state<Sort>('recent');
  const sorts: [Sort, string][] = [
    ['recent', 'Recently added'],
    ['az', 'A–Z'],
    ['za', 'Z–A'],
    ['played', 'Most played'],
  ];

  const shown = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? data.albums.filter(
          (a) =>
            a.name.toLowerCase().includes(needle) ||
            (a.artist ?? '').toLowerCase().includes(needle),
        )
      : [...data.albums];
    const byName = (a: (typeof list)[0], b: (typeof list)[0]) => cmpName(a.name, b.name);
    switch (sort) {
      case 'az':
        list.sort(byName);
        break;
      case 'za':
        list.sort((a, b) => byName(b, a));
        break;
      case 'played':
        list.sort((a, b) => b.playCount - a.playCount || byName(a, b));
        break;
      default:
        list.sort((a, b) => b.created.localeCompare(a.created));
    }
    return list;
  });
</script>

<svelte:head><title>Albums · Music</title></svelte:head>

<div class="p-4 md:p-6">
  <ListHeader
    title="Albums"
    count={shown.length}
    placeholder="Filter albums"
    bind:q
    bind:sort
    {sorts}
  />

  {#if data.albums.length === 0}
    <div class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      <p class="font-medium text-foreground">No albums yet.</p>
      <p class="mt-1">
        Your Navidrome library is empty. Add music and run a scan in Navidrome, then come back.
      </p>
    </div>
  {:else if shown.length === 0}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      No albums match “{q}”.
    </p>
  {:else}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {#each shown as a (a.id)}
        <AlbumCard
          id={a.id}
          name={a.name}
          artist={a.artist}
          artistId={a.artistId}
          coverArt={a.coverArt}
          year={a.year}
        />
      {/each}
    </div>
  {/if}
</div>

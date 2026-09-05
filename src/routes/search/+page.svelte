<script lang="ts">
  import { Search } from '@lucide/svelte';
  import Artwork from '$lib/components/Artwork.svelte';
  import AlbumCard from '$lib/components/AlbumCard.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const empty = $derived(
    data.q && !data.artists.length && !data.albums.length && !data.tracks.length,
  );
</script>

<svelte:head><title>Search · Music</title></svelte:head>
<div class="p-4 md:p-6">
  <form method="GET" class="relative mb-6">
    <Search
      size={16}
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
    />
    <input
      name="q"
      value={data.q}
      placeholder="Artists, albums, songs"
      autocomplete="off"
      autocapitalize="off"
      enterkeyhint="search"
      class="h-11 w-full rounded-md border bg-transparent pl-9 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  </form>

  {#if empty}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      No matches for “{data.q}”.
    </p>
  {/if}

  {#if data.artists.length}
    <h2 class="mb-2 text-lg font-semibold">Artists</h2>
    <div class="scroll-x mb-6 flex gap-4 overflow-x-auto pb-2">
      {#each data.artists as a (a.id)}
        <a href="/artists/{a.id}" class="w-28 shrink-0 text-center"
          ><Artwork coverArt={a.coverArt} name={a.name} size={300} class="rounded-full" />
          <div class="mt-1 truncate text-sm">{a.name}</div></a
        >
      {/each}
    </div>
  {/if}
  {#if data.albums.length}
    <h2 class="mb-2 text-lg font-semibold">Albums</h2>
    <div class="mb-6 flex gap-4 overflow-x-auto pb-2">
      {#each data.albums as a (a.id)}
        <div class="w-32 shrink-0">
          <AlbumCard
            id={a.id}
            name={a.name}
            artist={a.artist}
            artistId={a.artistId}
            coverArt={a.coverArt}
          />
        </div>
      {/each}
    </div>
  {/if}
  {#if data.tracks.length}
    <h2 class="mb-2 text-lg font-semibold">Songs</h2>
    <TrackList tracks={data.tracks} />
  {/if}
</div>

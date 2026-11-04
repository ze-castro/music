<script lang="ts">
  import { ChevronDown, Shuffle } from '@lucide/svelte';
  import Artwork from '$lib/components/Artwork.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import { player } from '$lib/stores/player.svelte';
  import type { Track } from '$lib/types';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let loading = $state(false);
  let cache: Track[] | null = null;
  let expanded = $state(false);
  // Collapse again when moving to another artist (the page component is reused).
  $effect.pre(() => {
    void data.artist.id;
    expanded = false;
  });
  const COLLAPSED = 5;

  async function shuffleArtist() {
    loading = true;
    try {
      if (!cache) {
        const r = await fetch(`/api/artists/${data.artist.id}/songs`);
        if (!r.ok) throw new Error(`http ${r.status}`);
        cache = (await r.json()).tracks;
      }
      if (!cache?.length) return;
      player.shuffle = true;
      player.playQueue(cache, Math.floor(Math.random() * cache.length));
    } finally {
      loading = false;
    }
  }
</script>
<svelte:head><title>{data.artist.name} · Music</title></svelte:head>
<div class="p-4 md:p-6">
  <div class="flex items-center gap-4">
    <Artwork coverArt={data.artist.coverArt} name={data.artist.name} size={300} class="w-24 rounded-full" />
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight">{data.artist.name}</h1>
      <button class="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50" onclick={shuffleArtist} disabled={loading}>
        <Shuffle size={16} />{loading ? 'Loading…' : 'Shuffle'}
      </button>
    </div>
  </div>
  {#if data.topSongs.length}
    <section class="mt-6">
      <h2 class="mb-2 text-lg font-semibold">Most played</h2>
      <TrackList
        tracks={expanded ? data.topSongs : data.topSongs.slice(0, COLLAPSED)}
        queue={data.topSongs}
        context="artist"
        albumArtist={data.artist.name}
      />
      {#if data.topSongs.length > COLLAPSED}
        <button
          class="mt-2 inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          onclick={() => (expanded = !expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronDown size={16} class="transition-transform {expanded ? 'rotate-180' : ''}" />
        </button>
      {/if}
    </section>
  {/if}
  <h2 class="{data.topSongs.length ? 'mt-8' : 'mt-6'} mb-2 text-lg font-semibold">Albums</h2>
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    {#each data.albums as a (a.id)}
      <a href="/albums/{a.id}" class="block">
        <Artwork coverArt={a.coverArt} name={a.name} size={400} />
        <div class="mt-2 truncate text-sm font-medium">{a.name}</div>
        <div class="truncate text-xs text-muted-foreground">{a.year ?? ''}</div>
      </a>
    {/each}
  </div>
</div>

<script lang="ts">
  import { Shuffle } from '@lucide/svelte';
  import Artwork from '$lib/components/Artwork.svelte';
  import { player } from '$lib/stores/player.svelte';
  import type { Track } from '$lib/types';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let loading = $state(false);
  let cache: Track[] | null = null;

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
  <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    {#each data.albums as a (a.id)}
      <a href="/albums/{a.id}" class="block">
        <Artwork coverArt={a.coverArt} name={a.name} size={400} />
        <div class="mt-2 truncate text-sm font-medium">{a.name}</div>
        <div class="truncate text-xs text-muted-foreground">{a.year ?? ''}</div>
      </a>
    {/each}
  </div>
</div>

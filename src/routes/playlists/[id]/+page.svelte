<script lang="ts">
  import { Play, Shuffle, Heart } from '@lucide/svelte';
  import Artwork from '$lib/components/Artwork.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import { player } from '$lib/stores/player.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.name} · Music</title></svelte:head>
<div class="p-4 md:p-6">
  <div class="flex items-end gap-5">
    {#if data.liked}
      <div
        class="grid w-32 shrink-0 aspect-square place-items-center rounded-md bg-gradient-to-br from-zinc-600 to-zinc-800"
      >
        <Heart size={40} class="text-white/90" fill="currentColor" />
      </div>
    {:else}
      <Artwork coverArt={data.coverArt} name={data.name} size={400} class="w-32 shrink-0" />
    {/if}
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight">{data.name}</h1>
      <div class="text-xs text-muted-foreground">{data.tracks.length} songs</div>
      {#if data.tracks.length}
        <div class="mt-3 flex gap-2">
          <button
            class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            onclick={() => {
              player.shuffle = false;
              player.playQueue(data.tracks, 0);
            }}><Play size={16} />Play</button
          >
          <button
            class="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm hover:bg-accent"
            onclick={() => {
              player.shuffle = true;
              player.playQueue(data.tracks, Math.floor(Math.random() * data.tracks.length));
            }}><Shuffle size={16} />Shuffle</button
          >
        </div>
      {/if}
    </div>
  </div>
  <div class="mt-6">
    {#if data.tracks.length === 0}
      <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        {data.liked ? 'Star songs or albums to see them here.' : 'This playlist is empty.'}
      </p>
    {:else}
      <TrackList tracks={data.tracks} />
    {/if}
  </div>
</div>

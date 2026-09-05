<script lang="ts">
  import { Play, Shuffle } from '@lucide/svelte';
  import Artwork from '$lib/components/Artwork.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import { player } from '$lib/stores/player.svelte';
  import { fmtTime } from '$lib/utils';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.album.name} · Music</title></svelte:head>

<div class="p-4 md:p-6">
  <div class="flex flex-col gap-5 sm:flex-row sm:items-end">
    <Artwork
      coverArt={data.album.coverArt}
      name={data.album.name}
      size={600}
      class="w-48 shrink-0 shadow-lg"
    />
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight">{data.album.name}</h1>
      <a href="/artists/{data.album.artistId}" class="text-muted-foreground hover:underline"
        >{data.album.artist}</a
      >
      <div class="mt-1 text-xs text-muted-foreground">
        {[
          data.album.year,
          data.album.genre,
          `${data.album.songCount} songs`,
          fmtTime(data.album.duration),
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
      <div class="mt-4 flex gap-2">
        <button
          class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          onclick={() => {
            player.shuffle = false;
            player.playQueue(data.tracks, 0);
          }}><Play size={16} />Play</button
        >
        <button
          class="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
          onclick={() => {
            player.shuffle = true;
            player.playQueue(data.tracks, Math.floor(Math.random() * data.tracks.length));
          }}><Shuffle size={16} />Shuffle</button
        >
      </div>
    </div>
  </div>

  <div class="mt-6">
    <TrackList tracks={data.tracks} numbered showArt={false} context="album" />
  </div>
</div>

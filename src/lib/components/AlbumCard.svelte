<script lang="ts">
  import Artwork from './Artwork.svelte';
  let {
    id,
    name,
    artist,
    artistId,
    coverArt,
    year,
  }: {
    id: string;
    name: string;
    artist?: string;
    artistId?: string;
    coverArt?: string;
    year?: number;
  } = $props();
</script>

<div class="min-w-0">
  <a href="/albums/{id}" class="block">
    <Artwork {coverArt} {name} size={400} />
    <div class="mt-2 truncate text-sm font-medium">{name}</div>
  </a>
  <div class="truncate text-xs text-muted-foreground">
    {#if artistId}<a href="/artists/{artistId}" class="hover:underline hover:text-foreground"
        >{artist}</a
      >{:else}{artist}{/if}{year ? ` · ${year}` : ''}
  </div>
</div>

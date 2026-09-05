<script lang="ts">
  import { Shuffle } from '@lucide/svelte';
  import ListHeader from '$lib/components/ListHeader.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import { player } from '$lib/stores/player.svelte';
  import { cmpName } from '$lib/sort';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  type Sort = 'recent' | 'az' | 'za' | 'played';
  let q = $state('');
  let sort = $state<Sort>('recent');
  const sorts: [Sort, string][] = [['recent', 'Recently added'], ['az', 'A–Z'], ['za', 'Z–A'], ['played', 'Most played']];
  const CHUNK = 300;
  let visible = $state(CHUNK);

  const shown = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? data.tracks.filter((t) => t.title.toLowerCase().includes(needle) || (t.artist ?? '').toLowerCase().includes(needle) || (t.album ?? '').toLowerCase().includes(needle))
      : [...data.tracks];
    const byTitle = (a: (typeof list)[0], b: (typeof list)[0]) => cmpName(a.title, b.title);
    switch (sort) {
      case 'az': list.sort(byTitle); break;
      case 'za': list.sort((a, b) => byTitle(b, a)); break;
      case 'played': list.sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0) || byTitle(a, b)); break;
      default: list.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
    }
    return list;
  });
  $effect(() => { q; sort; visible = CHUNK; });
  const shuffleAll = () => { player.shuffle = true; player.playQueue(shown, Math.floor(Math.random() * shown.length)); };
</script>

<svelte:head><title>Songs · Music</title></svelte:head>

<div class="p-4 md:p-6">
  <ListHeader title="Songs" count={shown.length} placeholder="Filter songs" bind:q bind:sort {sorts}>
    {#snippet actions()}
      <button class="hidden h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent md:inline-flex" disabled={!shown.length} onclick={shuffleAll}>
        <Shuffle size={16} />Shuffle
      </button>
    {/snippet}
  </ListHeader>

  {#if data.tracks.length === 0}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">No songs in your library yet.</p>
  {:else if shown.length === 0}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">No songs match “{q}”.</p>
  {:else}
    <TrackList tracks={shown.slice(0, visible)} queue={shown} />
    <!-- mobile: floating shuffle above mini-player + tab bar -->
    <button onclick={shuffleAll} aria-label="Shuffle"
      class="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-foreground text-background shadow-lg md:hidden"
      style="bottom: calc(env(safe-area-inset-bottom) + {player.current ? 8.5 : 4.5}rem)">
      <Shuffle size={22} />
    </button>
    {#if visible < shown.length}
      <button onclick={() => (visible += CHUNK)} class="mt-4 w-full rounded-md border py-2 text-sm hover:bg-accent">Show more ({shown.length - visible} left)</button>
    {/if}
  {/if}
</div>
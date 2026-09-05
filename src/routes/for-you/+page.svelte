<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import {
    Play,
    Square,
    X,
    ExternalLink,
    RefreshCw,
    Bookmark,
    Copy,
    Check,
    ChevronDown,
  } from '@lucide/svelte';
  import { preview } from '$lib/stores/preview.svelte';
  import { wishlist } from '$lib/stores/wishlist.svelte';
  import WishButton from '$lib/components/WishButton.svelte';
  import type { WishItem } from '$lib/wishlist-types';
  import type { ArtistRec, AlbumRec } from '$lib/server/recs';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  $effect(() => {
    wishlist.set(data.wishlist);
  });

  let refreshing = $state(false);
  async function refresh() {
    refreshing = true;
    await fetch('/api/recs/refresh', { method: 'POST' });
    await invalidateAll();
    refreshing = false;
  }
  async function dismiss(rowId: string) {
    await fetch('/api/recs/dismiss', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rowId }),
    });
    await invalidateAll();
  }

  const albumItem = (a: AlbumRec): WishItem => ({
    kind: 'album',
    deezerId: a.id,
    title: a.title,
    artist: a.artist,
    cover: a.cover,
    link: a.link,
    year: a.releaseDate.slice(0, 4),
  });
  const artistItem = (ar: ArtistRec): WishItem => ({
    kind: 'artist',
    deezerId: ar.id,
    title: ar.name,
    cover: ar.picture,
    link: ar.link,
  });
  const trackItem = (ar: ArtistRec, t: ArtistRec['topTracks'][0]): WishItem => ({
    kind: 'track',
    deezerId: t.id,
    title: t.title,
    artist: ar.name,
    cover: t.cover || ar.picture,
    link: ar.link,
    preview: t.preview,
  });

  let wishOpen = $state(false);
  let copied = $state(false);
  async function copyList() {
    await navigator.clipboard.writeText(wishlist.exportText());
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<svelte:head><title>For You · Music</title></svelte:head>

<div class="p-4 md:p-6">
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-2xl font-semibold tracking-tight">For You</h1>
    {#if !data.gated}
      <button
        onclick={refresh}
        disabled={refreshing}
        class="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent disabled:opacity-50"
        aria-label="Refresh"
      >
        <RefreshCw size={16} class={refreshing ? 'animate-spin' : ''} />Refresh
      </button>
    {/if}
  </div>

  {#if preview.error}
    <p class="mb-3 text-xs text-destructive">{preview.error}</p>
  {/if}

  <section class="mb-8 rounded-lg border">
    <button
      onclick={() => (wishOpen = !wishOpen)}
      class="flex w-full items-center justify-between px-3 py-3 text-left"
    >
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <Bookmark size={18} fill="currentColor" />Wishlist
        <span class="text-sm font-normal text-muted-foreground">{wishlist.items.length}</span>
      </h2>
      <ChevronDown
        size={18}
        class="text-muted-foreground transition-transform {wishOpen ? '' : '-rotate-90'}"
      />
    </button>
    {#if wishOpen}
      {#if wishlist.items.length === 0}
        <p class="border-t px-3 py-6 text-center text-sm text-muted-foreground">
          Tap <Bookmark size={14} class="inline" /> on anything below to save it here for later.
        </p>
      {:else}
        <ul class="divide-y border-t">
          {#each wishlist.items as w (w.id)}
            <li class="flex items-center gap-3 px-3 py-2">
              <img
                src={w.cover}
                alt=""
                class="h-10 w-10 shrink-0 object-cover {w.kind === 'artist'
                  ? 'rounded-full'
                  : 'rounded'}"
                loading="lazy"
              />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm">{w.title}</div>
                <div class="truncate text-xs text-muted-foreground">
                  <span class="rounded bg-muted px-1 py-px text-[10px] uppercase tracking-wide"
                    >{w.kind}</span
                  >
                  {#if w.artist}
                    {w.artist}{/if}{#if w.album}
                    · {w.album}{/if}{#if w.year}
                    · {w.year}{/if}
                </div>
              </div>
              {#if w.kind !== 'artist'}
                <button
                  onclick={() => preview.toggle(w.kind as 'track' | 'album', w.deezerId)}
                  class="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Preview"
                >
                  {#if preview.is(w.kind as 'track' | 'album', w.deezerId)}<Square
                      size={16}
                    />{:else}<Play size={16} />{/if}
                </button>
              {/if}
              <a
                href={w.link}
                target="_blank"
                rel="noopener"
                class="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Open on Deezer"><ExternalLink size={16} /></a
              >
              <button
                onclick={() => wishlist.toggle(w)}
                class="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Remove"><X size={16} /></button
              >
            </li>
          {/each}
        </ul>
        <div class="border-t p-2">
          <button
            onclick={copyList}
            class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border text-sm hover:bg-accent"
          >
            {#if copied}<Check size={16} />Copied{:else}<Copy size={16} />Copy as text{/if}
          </button>
        </div>
      {/if}
    {/if}
  </section>

  {#if data.gated}
    <div class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      <p class="font-medium text-foreground">
        Listen to a bit more and we'll start suggesting new music.
      </p>
      <p class="mt-1">{data.plays} of {data.threshold} plays so far.</p>
    </div>
  {:else}
    {#if data.deezerError}
      <p class="mb-4 rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive">
        Couldn't refresh suggestions ({data.deezerError}). Showing last known.
      </p>
    {/if}
    <p class="mb-6 text-xs text-muted-foreground">
      Previews are 30-second clips from Deezer. Nothing here is in your library yet — bookmark what
      you want to get.
    </p>

    {#if data.albums.length}
      <h2 class="mb-2 text-lg font-semibold">New releases from artists you play</h2>
      <div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {#each data.albums as a (a.rowId)}
          <div class="group min-w-0">
            <div class="relative">
              <img
                src={a.cover}
                alt=""
                class="aspect-square w-full rounded-md object-cover"
                loading="lazy"
              />
              <button
                onclick={() => preview.toggle('album', a.id)}
                class="absolute bottom-2 left-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow"
                aria-label="Preview"
              >
                {#if preview.is('album', a.id)}<Square size={16} />{:else}<Play
                    size={16}
                    class="ml-0.5"
                  />{/if}
              </button>
              <WishButton
                item={albumItem(a)}
                size={18}
                class="absolute bottom-2 right-2 h-9 w-9 bg-background/90 shadow"
              />
              <button
                onclick={() => dismiss(a.rowId)}
                class="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/80 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Dismiss"><X size={14} /></button
              >
            </div>
            <div class="mt-2 truncate text-sm font-medium">{a.title}</div>
            <div class="truncate text-xs text-muted-foreground">
              {a.artist} · {a.releaseDate.slice(0, 4)}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if data.artists.length}
      <h2 class="mb-2 text-lg font-semibold">Artists you might like</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.artists as ar (ar.rowId)}
          <div class="min-w-0 rounded-lg border p-3">
            <div class="flex items-center gap-3">
              <img
                src={ar.picture}
                alt=""
                class="h-14 w-14 rounded-full object-cover"
                loading="lazy"
              />
              <div class="min-w-0 flex-1">
                <div class="truncate font-medium">{ar.name}</div>
                <div class="truncate text-xs text-muted-foreground">Because you play {ar.seed}</div>
              </div>
              <WishButton item={artistItem(ar)} size={18} class="p-1" />
              <a
                href={ar.link}
                target="_blank"
                rel="noopener"
                class="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Open on Deezer"><ExternalLink size={16} /></a
              >
              <button
                onclick={() => dismiss(ar.rowId)}
                class="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"><X size={16} /></button
              >
            </div>
            {#if ar.topTracks.length}
              <ul class="mt-3 space-y-1">
                {#each ar.topTracks as t (t.id)}
                  <li class="flex items-center gap-1">
                    <button
                      onclick={() => preview.toggle('track', t.id)}
                      class="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left text-sm hover:bg-accent/60"
                    >
                      {#if preview.is('track', t.id)}<Square
                          size={14}
                          class="shrink-0"
                        />{:else}<Play size={14} class="shrink-0" />{/if}
                      <span class="min-w-0 flex-1 truncate">{t.title}</span>
                    </button>
                    <WishButton item={trackItem(ar, t)} size={14} class="p-1.5" />
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if !data.albums.length && !data.artists.length}
      <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Nothing to suggest yet. Try Refresh, or listen to more variety.
      </p>
    {/if}
  {/if}
</div>

<script lang="ts">
  import { Heart, Plus, MoreHorizontal, Pencil, Trash2 } from '@lucide/svelte';
  import { enhance } from '$app/forms';
  import Artwork from '$lib/components/Artwork.svelte';
  import ListHeader from '$lib/components/ListHeader.svelte';
  import { cmpName } from '$lib/sort';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  type Sort = 'changed' | 'az' | 'za';
  let q = $state('');
  let sort = $state<Sort>('changed');
  const sorts: [Sort, string][] = [
    ['changed', 'Recently updated'],
    ['az', 'A–Z'],
    ['za', 'Z–A'],
  ];

  const shown = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? data.playlists.filter((p) => p.name.toLowerCase().includes(needle))
      : [...data.playlists];
    const byName = (a: { name: string }, b: { name: string }) => cmpName(a.name, b.name);
    if (sort === 'az') list.sort(byName);
    else if (sort === 'za') list.sort((a, b) => byName(b, a));
    else list.sort((a, b) => b.changed.localeCompare(a.changed));
    return list;
  });
  const showLiked = $derived(!q.trim() || 'liked songs'.includes(q.trim().toLowerCase()));

  let creating = $state(false);
  let newName = $state('');
  let submitting = $state(false);
  let menuFor = $state<string | null>(null);
  let confirmDelete = $state<{ id: string; name: string } | null>(null);

  function openCreate() {
    newName = '';
    creating = true;
  }
</script>

<svelte:window onclick={() => (menuFor = null)} />
<svelte:head><title>Playlists · Music</title></svelte:head>

<div class="p-4 md:p-6">
  <ListHeader
    title="Playlists"
    count={shown.length + (showLiked ? 1 : 0)}
    placeholder="Filter playlists"
    bind:q
    bind:sort
    {sorts}
  >
    {#snippet actions()}
      <button
        onclick={openCreate}
        class="hidden h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent md:inline-flex"
      >
        <Plus size={16} />New playlist
      </button>
    {/snippet}
  </ListHeader>

  {#if !showLiked && shown.length === 0}
    <p class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      No playlists match “{q}”.
    </p>
  {:else}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {#if showLiked}
        <a href="/playlists/liked" class="block">
          <div
            class="grid aspect-square place-items-center rounded-md bg-gradient-to-br from-zinc-600 to-zinc-800"
          >
            <Heart size={48} class="text-white/90" fill="currentColor" />
          </div>
          <div class="mt-2 truncate text-sm font-medium">Liked Songs</div>
          <div class="text-xs text-muted-foreground">{data.likedCount} songs</div>
        </a>
      {/if}
      {#each shown as p (p.id)}
        <div class="relative">
          <a href="/playlists/{p.id}" class="block">
            <Artwork coverArt={p.coverArt} name={p.name} size={400} />
            <div class="mt-2 truncate pr-7 text-sm font-medium">{p.name}</div>
            <div class="truncate text-xs text-muted-foreground">{p.songCount} songs</div>
          </a>
          <button
            onclick={(e) => {
              e.stopPropagation();
              menuFor = menuFor === p.id ? null : p.id;
            }}
            class="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur hover:bg-background"
            aria-label="Playlist options for {p.name}"
            aria-haspopup="menu"
            aria-expanded={menuFor === p.id}
          >
            <MoreHorizontal size={16} />
          </button>
          {#if menuFor === p.id}
            <div
              class="absolute right-1 top-10 z-20 w-40 overflow-hidden rounded-md border bg-popover text-sm shadow-lg"
              role="menu"
            >
              <a
                href="/playlists/{p.id}/edit"
                class="flex items-center gap-2 px-3 py-2 hover:bg-accent"
                role="menuitem"><Pencil size={14} />Edit songs</a
              >
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  menuFor = null;
                  confirmDelete = { id: p.id, name: p.name };
                }}
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-destructive hover:bg-accent"
                role="menuitem"><Trash2 size={14} />Delete</button
              >
            </div>
          {/if}
        </div>
      {/each}
    </div>
    {#if data.playlists.length === 0}
      <p class="mt-6 rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No playlists yet. Tap + to create one.
      </p>
    {/if}
  {/if}

  <!-- mobile: floating create button above mini-player + tab bar -->
  <button
    onclick={openCreate}
    aria-label="New playlist"
    class="fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-foreground text-background shadow-lg md:hidden"
    style="bottom: calc(var(--bottom-stack, 6.5rem) + 0.75rem)"
  >
    <Plus size={24} />
  </button>
</div>

{#if creating}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="New playlist"
  >
    <form
      method="POST"
      action="?/create"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          creating = false;
          await update();
        };
      }}
      class="w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl"
    >
      <h2 class="mb-3 text-lg font-semibold">New playlist</h2>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        name="name"
        bind:value={newName}
        autofocus
        autocomplete="off"
        placeholder="Playlist name"
        class="h-10 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={() => (creating = false)}
          class="h-9 rounded-md border px-4 text-sm hover:bg-accent">Cancel</button
        >
        <button
          type="submit"
          disabled={submitting || !newName.trim()}
          class="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >{submitting ? 'Creating…' : 'Create'}</button
        >
      </div>
    </form>
  </div>
{/if}

{#if confirmDelete}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
    role="alertdialog"
    aria-modal="true"
    aria-label="Delete playlist"
  >
    <form
      method="POST"
      action="?/delete"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          confirmDelete = null;
          await update();
        };
      }}
      class="w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl"
    >
      <input type="hidden" name="id" value={confirmDelete.id} />
      <h2 class="text-lg font-semibold">Delete “{confirmDelete.name}”?</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        This permanently removes the playlist from your Navidrome server. The songs themselves stay
        in your library. This can't be undone.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={() => (confirmDelete = null)}
          class="h-9 rounded-md border px-4 text-sm hover:bg-accent">Cancel</button
        >
        <button
          type="submit"
          disabled={submitting}
          class="h-9 rounded-md bg-destructive px-4 text-sm font-medium text-white disabled:opacity-50"
          >{submitting ? 'Deleting…' : 'Delete'}</button
        >
      </div>
    </form>
  </div>
{/if}

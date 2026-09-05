<script lang="ts">
  import { Disc3, Mic2, Music2, ListMusic, Search, ChevronRight } from '@lucide/svelte';
  const items = [
    { href: '/', label: 'Albums', icon: Disc3 },
    { href: '/artists', label: 'Artists', icon: Mic2 },
    { href: '/songs', label: 'Songs', icon: Music2 },
    { href: '/playlists', label: 'Playlists', icon: ListMusic },
  ];
</script>

<svelte:head><title>Library · Music</title></svelte:head>
<div class="p-4 md:p-6">
  <h1 class="mb-4 text-2xl font-semibold tracking-tight">Library</h1>
  <form method="GET" action="/search" class="relative mb-4">
    <Search
      size={16}
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
    />
    <input
      name="q"
      placeholder="Search"
      autocomplete="off"
      autocapitalize="off"
      enterkeyhint="search"
      class="h-11 w-full rounded-md border bg-transparent pl-9 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  </form>
  <ul class="divide-y rounded-lg border">
    {#each items as it}
      <li>
        <a href={it.href} class="flex items-center gap-3 px-3 py-3 hover:bg-accent/60">
          <it.icon size={20} class="text-muted-foreground" /><span class="flex-1 text-base"
            >{it.label}</span
          ><ChevronRight size={16} class="text-muted-foreground" />
        </a>
      </li>
    {/each}
  </ul>
</div>

<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { Disc3, Mic2, Music2, ListMusic, Sparkles, Search, Settings, Library } from '@lucide/svelte';
  import MiniPlayer from '$lib/components/MiniPlayer.svelte';
  import NowPlaying from '$lib/components/NowPlaying.svelte';
  import { player } from '$lib/stores/player.svelte';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const nav = [
    { href: '/', label: 'Albums', icon: Disc3 },
    { href: '/artists', label: 'Artists', icon: Mic2 },
    { href: '/songs', label: 'Songs', icon: Music2 },
    { href: '/playlists', label: 'Playlists', icon: ListMusic },
    { href: '/for-you', label: 'For You', icon: Sparkles }
  ];
  const mobileNav = [
    { href: '/for-you', label: 'For You', icon: Sparkles },
    { href: '/library', label: 'Library', icon: Library },
    { href: '/settings', label: 'Settings', icon: Settings }
  ];
  const LIBRARY_PATHS = ['/', '/albums', '/artists', '/songs', '/playlists', '/search', '/library'];
  const active = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
  const mobileActive = (href: string) => (href === '/library' ? LIBRARY_PATHS.some((p) => p === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(p)) : active(href));

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.code === 'Space') { e.preventDefault(); player.toggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? player.next() : player.seekBy(10); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? player.prev() : player.seekBy(-10); }
    else if (e.key === 'Escape') player.expanded = false;
  }
</script>

<svelte:window onkeydown={onKey} />

{#if data.user}
  <div class="flex h-dvh flex-col overflow-hidden md:flex-row">
    <aside class="hidden md:flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground pt-safe">
      <div class="px-4 py-4 text-lg font-semibold tracking-tight">Music</div>
      <nav class="flex-1 space-y-0.5 px-2">
        {#each nav as n}
          <a href={n.href} class="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm {active(n.href) ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/60'}">
            <n.icon size={16} />{n.label}
          </a>
        {/each}
        <a href="/search" class="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm {active('/search') ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/60'}"><Search size={16} />Search</a>
      </nav>
      <div class="border-t px-2 py-2">
        <a href="/settings" class="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm {active('/settings') ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/60'}"><Settings size={16} />Settings</a>
      </div>
    </aside>

    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <!-- mobile: leave room under content for the floating stack -->
      <main class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-safe {player.current ? 'pb-44' : 'pb-24'} md:pb-0">
        {@render children()}
      </main>

      <!-- desktop: docked mini player -->
      <div class="hidden md:block"><MiniPlayer /></div>

      <!-- mobile: floating mini player + pill tab bar -->
      <div class="pointer-events-none absolute inset-x-0 bottom-0 z-40 md:hidden" style="padding-bottom: calc(min(env(safe-area-inset-bottom), 24px) + 8px)">
        <div class="pointer-events-auto mx-3 flex flex-col items-center gap-1.5">
          <div class="w-full"><MiniPlayer floating /></div>
          <nav class="flex items-center gap-1 rounded-full border bg-card/80 p-1 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
            {#each mobileNav as n}
              <a href={n.href} aria-label={n.label} aria-current={mobileActive(n.href) ? 'page' : undefined}
                class="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors {mobileActive(n.href) ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent'}">
                <n.icon size={18} />{#if mobileActive(n.href)}<span>{n.label}</span>{/if}
              </a>
            {/each}
          </nav>
        </div>
      </div>
    </div>
  </div>
  <NowPlaying />
{:else}
  {@render children()}
{/if}
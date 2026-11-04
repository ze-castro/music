<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { beforeNavigate, afterNavigate, onNavigate } from '$app/navigation';
  import { onMount, tick } from 'svelte';
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
    // Leave browser shortcuts alone: Cmd+←/→ is back/forward.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.code === 'Space') { e.preventDefault(); player.toggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? player.next() : player.seekBy(10); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? player.prev() : player.seekBy(-10); }
    else if (e.key === 'Escape') player.expanded = false;
  }

  // iOS Safari only shows :active press states once the page listens for touches.
  onMount(() => {
    const noop = () => {};
    document.addEventListener('touchstart', noop, { passive: true });
    return () => document.removeEventListener('touchstart', noop);
  });

  // Height of the floating mobile stack (mini player + tab bar + safe area).
  // Exposed as --bottom-stack so page-level floating buttons can sit above it.
  let stackH = $state(0);

  // Scroll restoration for <main> (inner scroller — SvelteKit only restores window scroll)
  let mainEl = $state<HTMLElement | null>(null);
  const scrollPos = new Map<string, number>();
  const key = (u: URL) => u.pathname + u.search;
  beforeNavigate(({ from }) => { if (from && mainEl) scrollPos.set(key(from.url), mainEl.scrollTop); });
  afterNavigate(async ({ to, type }) => {
    if (mainEl && to) {
      await tick();
      mainEl.scrollTop = type === 'popstate' ? (scrollPos.get(key(to.url)) ?? 0) : 0;
    }
    scrolled?.();
  });

  // Page change crossfade (View Transitions; browsers without it just switch).
  // Only what changed fades: the tab bar and mini player look the same in both
  // pictures, so they stay still.
  // Set when the browser already animated a back/forward swipe itself (Safari).
  let browserAnimated = false;
  // Resolved by afterNavigate once the new page's scroll position is set.
  let scrolled: (() => void) | null = null;
  // The fade must never hold up a page change. On the iPhone app, Safari could sit on
  // a transition for seconds before giving up, so both waits are capped, and a device
  // that hits a cap gets plain page switches for the rest of the session.
  const START_WITHIN = 200; // browser takes its "before" picture and starts the fade
  const FINISH_WITHIN = 400; // new page rendered and scrolled
  let fadeOff = false;
  const wait = (ms: number) => new Promise<'late'>((r) => setTimeout(() => r('late'), ms));
  onNavigate((nav) => {
    if (fadeOff || !document.startViewTransition) return;
    // Same page, new query (search, sort): not a page change.
    if (nav.from?.url.pathname === nav.to?.url.pathname) return;
    if (nav.type === 'popstate' && browserAnimated) return;
    // A sheet or dialog is open or still closing: let it finish on its own.
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
    return new Promise<void>((resolve) => {
      const ready = new Promise<void>((r) => (scrolled = r));
      // Browser slow to start the fade: cancel it (that unfreezes the screen) and change page now.
      const startTimer = setTimeout(() => {
        fadeOff = true;
        vt.skipTransition();
        resolve();
      }, START_WITHIN);
      const vt = document.startViewTransition(async () => {
        clearTimeout(startTimer);
        resolve();
        // Take the "after" picture once the scroll is restored, not before it jumps.
        const done = nav.complete.then(() => ready).catch(() => {});
        if ((await Promise.race([done, wait(FINISH_WITHIN)])) === 'late') fadeOff = true;
        scrolled = null;
      });
    });
  });
</script>

<svelte:window
  onkeydown={onKey}
  onpopstate={(e) => (browserAnimated = !!(e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition)}
/>

{#if data.user}
  <div class="flex h-[100lvh] w-full flex-col overflow-hidden md:flex-row">
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

    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col" style="--bottom-stack: {stackH}px">
      <!-- mobile: leave room under content for the floating stack -->
      <main bind:this={mainEl} class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-safe {player.current ? 'pb-52' : 'pb-32'} md:pb-0">
        {@render children()}
      </main>

      <!-- desktop: docked mini player -->
      <div class="hidden md:block"><MiniPlayer /></div>

      <!-- mobile: floating mini player + pill tab bar -->
      <div bind:clientHeight={stackH} class="pointer-events-none absolute inset-x-0 bottom-0 z-40 md:hidden" style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 48px)">
        <div class="pointer-events-auto mx-3 flex flex-col items-center gap-1.5">
          <div class="w-full"><MiniPlayer floating /></div>
          <nav class="flex items-center gap-1 rounded-full border bg-card/80 p-1.5 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
            {#each mobileNav as n}
              <a href={n.href} aria-label={n.label} aria-current={mobileActive(n.href) ? 'page' : undefined}
                class="flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors {mobileActive(n.href) ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent'}">
                <n.icon size={22} />{#if mobileActive(n.href)}<span>{n.label}</span>{/if}
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
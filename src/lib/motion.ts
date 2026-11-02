import type { TransitionConfig } from 'svelte/transition';

/** CSS cubic-bezier() as a JS easing function, for Svelte transitions. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t: number) => {
    if (t <= 0 || t >= 1) return t;
    // Solve x(s) = t: Newton first, bisection if the slope is too flat.
    let s = t;
    for (let i = 0; i < 6; i++) {
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= (x(s) - t) / d;
    }
    if (s < 0 || s > 1 || Math.abs(x(s) - t) > 1e-4) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 20; i++) {
        s = (lo + hi) / 2;
        if (x(s) < t) lo = s;
        else hi = s;
      }
    }
    return y(s);
  };
}

// Same curves as --ease-out / --ease-drawer in app.css.
export const easeOut = cubicBezier(0.23, 1, 0.32, 1);
export const easeDrawer = cubicBezier(0.32, 0.72, 0, 1);

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Slide in from / out to the bottom edge, by the element's own height.
 * Starts from wherever the element already is (e.g. mid-swipe).
 * Reduced motion: fade only.
 */
export function slideUp(
  node: Element,
  { duration = 300, fade = false, instant = false }: { duration?: number; fade?: boolean; instant?: boolean } = {},
): TransitionConfig {
  if (instant) return { duration: 0 };
  if (reducedMotion()) return { duration: 200, css: (t) => `opacity: ${t}` };
  const base = getComputedStyle(node).transform;
  const from = base === 'none' ? '' : base;
  return {
    duration,
    easing: easeDrawer,
    css: (t, u) => `transform: ${from} translateY(${u * 100}%);${fade ? ` opacity: ${t};` : ''}`,
  };
}

'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Two hooks for reading browser-only state during render.
 *
 * Both use `useSyncExternalStore`, which is the primitive React provides for
 * exactly this: it takes a server snapshot and a client snapshot, so the first
 * client render matches the server HTML and React swaps in the real value
 * without a hydration mismatch — and without a `setState` inside an effect,
 * which triggers a cascading second render on every mount.
 */

/** `subscribe` for a value that never changes after the first client render. */
const neverChanges = (): (() => void) => () => undefined;

/**
 * False during SSR and on the very first client render, true from then on.
 *
 * Use it to gate anything that cannot exist on the server — a portal, or an
 * ARIA attribute whose value depends on `localStorage`.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true, // client
    () => false, // server
  );
}

/**
 * Live result of a CSS media query. Always false on the server, because there
 * is no viewport there — design the fallback around that (stack first, split
 * once you know the screen is wide enough).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

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

/**
 * The standard one-shot data load with reload, shared by every view that
 * fetches on mount and offers "Try again".
 *
 * Callers MUST pass a stable function reference (a module-level api-client
 * function, or a `useCallback`-wrapped closure): it is in the effect deps, so
 * an inline arrow would refetch on every render.
 *
 * `error` is the thrown message (or `fallbackMessage` when the throw is not an
 * Error); `reload` refetches and clears the error. The effect sets state only
 * if the component is still mounted (the `isStale` guard).
 */
export function useFetchData<T>(
  fetchFn: () => Promise<T>,
  fallbackMessage: string,
): { data: T | null; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyData = useCallback((next: T) => {
    setError(null);
    setData(next);
  }, []);

  const applyError = useCallback(
    (cause: unknown) => {
      setError(cause instanceof Error ? cause.message : fallbackMessage);
    },
    [fallbackMessage],
  );

  useEffect(() => {
    let isStale = false;
    fetchFn()
      .then((next) => {
        if (!isStale) applyData(next);
      })
      .catch((cause: unknown) => {
        if (!isStale) applyError(cause);
      });
    return () => {
      isStale = true;
    };
  }, [fetchFn, applyData, applyError]);

  const reload = useCallback(() => {
    fetchFn().then(applyData).catch(applyError);
  }, [fetchFn, applyData, applyError]);

  return { data, error, reload };
}

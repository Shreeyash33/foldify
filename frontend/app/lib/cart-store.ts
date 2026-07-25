import type { CartItem } from '@foldify/shared';

/**
 * The cart, as an external store that `useSyncExternalStore` can read.
 *
 * Why not plain `useState` in the provider:
 *   - Reading localStorage in a lazy initialiser gives the client a full cart
 *     on its first render while the server rendered an empty one — a hydration
 *     mismatch anywhere the cart is displayed.
 *   - Loading it in an effect instead means a setState on every mount, which
 *     costs a second render pass and is what `react-hooks/set-state-in-effect`
 *     is warning about.
 *
 * An external store solves both: `getServerSnapshot` returns the same frozen
 * empty array the server rendered, `getSnapshot` returns the real one, and
 * React handles the swap without a mismatch and without an effect.
 *
 * It also means a 'storage' event from another tab keeps every open tab's cart
 * in step, which the useState version could not do at all.
 */

const STORAGE_KEY = 'foldify-cart';

/** Stable reference — returning a new [] each call would loop React forever. */
const EMPTY: readonly CartItem[] = Object.freeze([]);

let items: readonly CartItem[] = EMPTY;
let hasLoaded = false;

const listeners = new Set<() => void>();

function parse(raw: string | null): readonly CartItem[] {
  if (raw === null) return EMPTY;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    // Anything malformed is dropped rather than crashing the whole app.
    const valid = parsed.filter(
      (item): item is CartItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CartItem).productId === 'number' &&
        typeof (item as CartItem).quantity === 'number',
    );

    return valid.length === 0 ? EMPTY : valid;
  } catch {
    return EMPTY;
  }
}

function read(): readonly CartItem[] {
  try {
    return parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private browsing, or storage disabled entirely.
    return EMPTY;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(onChange: () => void): () => void {
  // First subscriber pulls the stored cart in. React re-reads the snapshot
  // straight after subscribing, so the value is picked up without an effect.
  if (!hasLoaded) {
    items = read();
    hasLoaded = true;
  }

  listeners.add(onChange);

  // Another tab changed the cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    items = parse(event.newValue);
    emit();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function getSnapshot(): readonly CartItem[] {
  return items;
}

export function getServerSnapshot(): readonly CartItem[] {
  return EMPTY;
}

/** Replaces the cart and persists it. The only way to write. */
export function setCartItems(next: readonly CartItem[]): void {
  items = next.length === 0 ? EMPTY : next;
  hasLoaded = true;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — the cart still works for this session.
  }

  emit();
}

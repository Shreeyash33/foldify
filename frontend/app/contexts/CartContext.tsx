'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import type { CartItem, Product } from '@foldify/shared';
import {
  getServerSnapshot,
  getSnapshot,
  setCartItems,
  subscribe,
} from '@/app/lib/cart-store';

/**
 * The cart is entirely client-side and persisted to localStorage. There is no
 * cart table and no cart endpoint — only a completed order reaches the server,
 * and the server recomputes every price from the products table when it does.
 *
 * State lives in lib/cart-store.ts and is read here with `useSyncExternalStore`;
 * see that file for why it is not plain `useState`.
 */

const MAX_QTY_PER_LINE = 99;

interface CartContextValue {
  items: readonly CartItem[];
  add: (product: Product, quantity?: number) => void;
  remove: (productId: number) => void;
  updateQty: (productId: number, quantity: number) => void;
  clear: () => void;
  /** Total number of units, for the navbar badge. */
  count: number;
  /** Sum in minor units. Display-only — the server computes the real total. */
  subtotalMinor: number;
  isEmpty: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((product: Product, quantity = 1) => {
    const current = getSnapshot();
    const existing = current.find((item) => item.productId === product.id);

    if (existing !== undefined) {
      setCartItems(
        current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QTY_PER_LINE) }
            : item,
        ),
      );
      return;
    }

    setCartItems([
      ...current,
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        unitPriceMinor: product.priceMinor,
        imageUrl: product.imageUrl,
        quantity: Math.min(quantity, MAX_QTY_PER_LINE),
      },
    ]);
  }, []);

  const remove = useCallback((productId: number) => {
    setCartItems(getSnapshot().filter((item) => item.productId !== productId));
  }, []);

  const updateQty = useCallback((productId: number, quantity: number) => {
    const current = getSnapshot();

    if (quantity <= 0) {
      setCartItems(current.filter((item) => item.productId !== productId));
      return;
    }

    setCartItems(
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, MAX_QTY_PER_LINE) }
          : item,
      ),
    );
  }, []);

  const clear = useCallback(() => setCartItems([]), []);

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const subtotalMinor = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      add,
      remove,
      updateQty,
      clear,
      count,
      subtotalMinor,
      isEmpty: items.length === 0,
    }),
    [items, add, remove, updateQty, clear, count, subtotalMinor],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) throw new Error('useCart must be used inside <CartProvider>.');
  return context;
}

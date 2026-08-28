'use client';

import { useState } from 'react';
import type { Product } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { useCart } from '@/app/contexts/CartContext';
import { useToast } from '@/app/contexts/ToastContext';

/** Capped at the smaller of ten and what is actually on the shelf. */
function quantityOptions(stock: number) {
  return Array.from({ length: Math.min(stock, 10) }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
}

export function AddToCart({ product }: { product: Product }) {
  const cart = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState('1');

  if (product.stock === 0) {
    return <Badge tone="danger">Sold out</Badge>;
  }

  function handleAdd() {
    cart.add(product, Number.parseInt(quantity, 10));
    toast.success(`${product.name} added to your cart.`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Quantity"
        options={quantityOptions(product.stock)}
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        className="w-28"
      />
      <Button type="button" variant="primary" size="lg" onClick={handleAdd}>
        Add to cart
      </Button>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import {
  Card,
  CardBody,
  CardFooter,
  CardMedia,
  CardMeta,
  CardTitle,
} from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { useCart } from '@/app/contexts/CartContext';
import { formatPrice } from '@/app/lib/utils';

export function CartView() {
  const { items, updateQty, remove, clear, subtotalMinor, isEmpty } = useCart();

  if (isEmpty) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <CardTitle>Nothing in the cart yet</CardTitle>
          <CardMeta>Every folded model is in the shop.</CardMeta>
          <Button href="/products" variant="primary">
            Browse the shop
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <Card key={item.productId}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <CardMedia
              src={item.imageUrl}
              alt={item.name}
              className="sm:w-40 sm:shrink-0"
            />

            <CardBody className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Link href={`/products/${item.slug}`}>
                  <CardTitle>{item.name}</CardTitle>
                </Link>
                <CardMeta>{formatPrice(item.unitPriceMinor)} each</CardMeta>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  max={99}
                  value={String(item.quantity)}
                  onChange={(event) =>
                    updateQty(item.productId, Number.parseInt(event.target.value, 10) || 0)
                  }
                  className="w-24"
                />

                <Badge tone="neutral">
                  {formatPrice(item.unitPriceMinor * item.quantity)}
                </Badge>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(item.productId)}
                >
                  Remove
                </Button>
              </div>
            </CardBody>
          </div>
        </Card>
      ))}

      <Card material="cardboard">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Subtotal</CardTitle>
          <Badge tone="accent">{formatPrice(subtotalMinor)}</Badge>
        </CardBody>

        <CardFooter className="justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear cart
          </Button>
          <Button href="/checkout" variant="primary">
            Checkout
          </Button>
        </CardFooter>
      </Card>

      {/* The server recomputes every price when the order is placed; this total
          is for the shopper's benefit only and is never sent. */}
      <CardMeta>Shipping is calculated at checkout.</CardMeta>
    </div>
  );
}

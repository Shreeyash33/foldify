'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Order } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { ApiClientError, verifyOrderPayment } from '@/app/lib/api-client';
import { formatPrice } from '@/app/lib/utils';
import { useCart } from '@/app/contexts/CartContext';

type State =
  | { phase: 'verifying' }
  | { phase: 'done'; order: Order }
  | { phase: 'failed'; message: string };

/** Server or network error during verification — generic safety message. */
function PaymentProblem({ message }: { message: string }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3">
        <Badge tone="danger">Not confirmed</Badge>
        <p>{message}</p>
      </CardBody>
      <CardFooter>
        <Button href="/profile" variant="secondary">
          See your orders
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Where Khalti returns the browser after payment (and where the dev simulated
 * fallback lands). This page never asserts success itself — it asks the server
 * to verify the payment against the provider.
 *
 * When the payment failed or was cancelled the server returns the order with
 * `status: 'cancelled'` and stock already restored. This page restores the
 * cancelled order's items into the client-side cart and shows a clear message.
 */
export function PaymentReturn() {
  const searchParams = useSearchParams();
  const rawId =
    searchParams.get('purchase_order_id') ?? searchParams.get('order') ?? '';
  const orderId = Number.parseInt(rawId, 10);
  const hasOrderId = !Number.isNaN(orderId);

  const [state, setState] = useState<State>({ phase: 'verifying' });
  // React runs effects twice in development; verifying twice would consume the
  // reference and report a false failure on the second pass.
  const hasStarted = useRef(false);
  const hasRestored = useRef(false);

  const { restore } = useCart();

  useEffect(() => {
    if (!hasOrderId || hasStarted.current) return;
    hasStarted.current = true;

    verifyOrderPayment(orderId)
      .then((order) => setState({ phase: 'done', order }))
      .catch((error: unknown) => {
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'The payment could not be verified. Your order is safe — check it in your profile.';
        setState({ phase: 'failed', message });
      });
  }, [orderId, hasOrderId]);

  // Restore a cancelled order into the cart — an effect, not render, so React
  // never sees a state update during another component's render pass.
  useEffect(() => {
    if (state.phase !== 'done' || state.order.status !== 'cancelled' || hasRestored.current) return;
    if (state.order.items === undefined) return;
    hasRestored.current = true;
    restore(
      state.order.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
      })),
    );
  }, [state, restore]);

  // Derived, not stored: a malformed link is knowable during render.
  if (!hasOrderId) {
    return <PaymentProblem message="That payment link is missing its order." />;
  }

  if (state.phase === 'verifying') {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Confirming your payment</CardTitle>
          <Skeleton shape="text" lines={2} />
        </CardBody>
      </Card>
    );
  }

  if (state.phase === 'failed') {
    return <PaymentProblem message={state.message} />;
  }

  // state.phase === 'done'
  const order = state.order;

  if (order.status === 'cancelled') {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Cancelled</Badge>
          <CardTitle>Payment cancelled</CardTitle>
          <CardMeta>
            Your payment was cancelled, so the order was cancelled too and the
            items are back in your cart.
          </CardMeta>
        </CardBody>
        <CardFooter className="justify-between">
          <Button href="/cart" variant="secondary">
            Back to cart
          </Button>
          <Button href="/products" variant="primary">
            Continue shopping
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (order.status === 'pending') {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="neutral">Pending</Badge>
          <CardTitle>Still confirming</CardTitle>
          <CardMeta>
            Khalti is still confirming your payment. You can check your orders
            in a moment.
          </CardMeta>
        </CardBody>
        <CardFooter>
          <Button href="/profile" variant="primary">
            See your orders
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3">
        <Badge tone="accent">{order.status}</Badge>
        <CardTitle>Order #{order.id} confirmed</CardTitle>
        <CardMeta>
          {formatPrice(order.totalMinor, order.currency)} — shipping to{' '}
          {order.shippingCity}
        </CardMeta>
      </CardBody>

      <CardFooter className="justify-between">
        <Button href="/products" variant="ghost">
          Keep shopping
        </Button>
        <Button href="/profile" variant="primary">
          See your orders
        </Button>
      </CardFooter>
    </Card>
  );
}

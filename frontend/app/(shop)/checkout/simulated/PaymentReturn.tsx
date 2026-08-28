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

type State =
  | { phase: 'verifying' }
  | { phase: 'done'; order: Order }
  | { phase: 'failed'; message: string };

/** The order itself is already placed, so this always points at the profile. */
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
 * Where the simulated gateway returns to. Verification is a server call
 * against the provider — the browser is only asking for it, never asserting
 * that payment succeeded.
 */
export function PaymentReturn() {
  const searchParams = useSearchParams();
  const orderId = Number.parseInt(searchParams.get('order') ?? '', 10);
  const hasOrderId = !Number.isNaN(orderId);

  const [state, setState] = useState<State>({ phase: 'verifying' });
  // React runs effects twice in development; verifying twice would consume the
  // reference and report a false failure on the second pass.
  const hasStarted = useRef(false);

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

  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3">
        <Badge tone="accent">{state.order.status}</Badge>
        <CardTitle>Order #{state.order.id} confirmed</CardTitle>
        <CardMeta>
          {formatPrice(state.order.totalMinor, state.order.currency)} — shipping to{' '}
          {state.order.shippingCity}
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

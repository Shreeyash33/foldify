'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BadgeTone } from '@/app/components/ui/Badge';
import type { Order, OrderStatus } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { ApiClientError, listOrders } from '@/app/lib/api-client';
import { formatDate, formatPrice } from '@/app/lib/utils';

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'neutral',
  paid: 'accent',
  processing: 'neutral',
  shipped: 'accent',
  delivered: 'accent',
  cancelled: 'danger',
  refunded: 'danger',
};

export function ProfileView() {
  const router = useRouter();
  const toast = useToast();
  const { user, isLoading, logout } = useAuth();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user === null) router.replace('/login?next=/profile');
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user === null) return;

    let isStale = false;

    listOrders()
      .then((result) => {
        if (!isStale) setOrders(result);
      })
      .catch((error: unknown) => {
        if (isStale) return;
        setOrdersError(
          error instanceof ApiClientError
            ? error.message
            : 'Your orders could not be loaded right now.',
        );
      });

    return () => {
      isStale = true;
    };
  }, [user]);

  async function handleLogout() {
    await logout();
    toast.success('Signed out.');
    router.replace('/');
  }

  if (isLoading || user === null) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-4">
          <Skeleton shape="title" />
          <Skeleton shape="text" lines={3} />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody className="flex flex-col gap-2">
          <CardTitle>{user.name}</CardTitle>
          <CardMeta>{user.email}</CardMeta>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cardboard" size="sm">
              {user.role}
            </Badge>
            <Badge tone="neutral" size="sm">
              Joined {formatDate(user.createdAt)}
            </Badge>
          </div>
        </CardBody>

        <CardFooter className="justify-between">
          {user.role === 'admin' ? (
            <Button href="/admin" variant="secondary" size="sm">
              Admin
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </CardFooter>
      </Card>

      <OrderList orders={orders} error={ordersError} />
    </div>
  );
}

function OrderList({ orders, error }: { orders: Order[] | null; error: string | null }) {
  if (error !== null) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (orders === null) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <Skeleton shape="title" />
          <Skeleton shape="text" lines={2} />
        </CardBody>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <CardTitle>No orders yet</CardTitle>
          <Button href="/products" variant="primary" size="sm">
            Browse the shop
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Order #{order.id}</CardTitle>
              <CardMeta>{formatDate(order.createdAt)}</CardMeta>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
              <Badge tone="neutral">{formatPrice(order.totalMinor, order.currency)}</Badge>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

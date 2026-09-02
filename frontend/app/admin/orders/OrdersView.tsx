'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { useToast } from '@/app/contexts/ToastContext';
import { listAdminOrders, updateOrderStatus } from '@/app/lib/api-client';
import type { AdminOrder, OrderStatus } from '@foldify/shared';

const STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function formatPrice(minor: number): string {
  return `Rs. ${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_OPTIONS = STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
}));

export function OrdersView() {
  const toast = useToast();
  // The admin list does not include items; keeping per-order change status is
  // enough for a first version.
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, OrderStatus>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const applyData = useCallback((data: AdminOrder[]) => {
    setError(null);
    setOrders(data);
  }, []);

  const applyError = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Could not load the orders.');
  }, []);

  useEffect(() => {
    let isStale = false;
    listAdminOrders()
      .then((data) => {
        if (!isStale) applyData(data);
      })
      .catch((cause: unknown) => {
        if (!isStale) applyError(cause);
      });
    return () => {
      isStale = true;
    };
  }, [applyData, applyError]);

  const reload = useCallback(() => {
    listAdminOrders().then(applyData).catch(applyError);
  }, [applyData, applyError]);

  const setDraft = (id: number, status: OrderStatus) => {
    setDrafts((current) => ({ ...current, [id]: status }));
  };

  const handleSave = async (order: AdminOrder) => {
    const status = drafts[order.id];
    if (status === undefined || status === order.status) return;

    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, status);
      toast.success(`Order #${order.id} is now ${STATUS_LABEL[status].toLowerCase()}.`);
      setDrafts((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update the order.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        eyebrow="Admin"
        title="Orders"
        description="Every order across every customer, newest first."
      />

      {error !== null ? (
        <Card>
          <CardBody className="flex flex-col items-start gap-3">
            <Badge tone="danger">Problem</Badge>
            <p>{error}</p>
            <Button onClick={() => void reload()} variant="secondary" size="sm">
              Try again
            </Button>
          </CardBody>
        </Card>
      ) : orders === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <CardBody className="flex flex-col gap-3">
                <Skeleton shape="title" />
                <Skeleton shape="text" lines={3} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardBody>
            <p>No orders yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-crease px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Order #{order.id}</CardTitle>
                    <Badge tone={order.status === 'cancelled' ? 'danger' : 'accent'} size="sm">
                      {STATUS_LABEL[order.status]}
                    </Badge>
                  </div>
                  <CardMeta>
                    {order.customerName} &lt;{order.customerEmail}&gt; · {order.createdAt}
                  </CardMeta>
                </div>
                <p className="font-display text-lg text-ink">{formatPrice(order.totalMinor)}</p>
              </div>

              <CardBody className="flex flex-col gap-1.5">
                <p className="font-body text-sm text-ink">
                  To {order.shippingName}, {order.shippingCity} · {order.shippingPhone}
                </p>
                <p className="font-mono text-sm break-words text-ink-muted">{order.shippingAddress}</p>
              </CardBody>

              <CardFooter className="justify-between">
                <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">
                  {order.paymentRef ?? 'no payment reference'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    label="Status"
                    hideLabel
                    options={STATUS_OPTIONS}
                    value={drafts[order.id] ?? order.status}
                    onChange={(event) => setDraft(order.id, event.target.value as OrderStatus)}
                    className="w-40"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={drafts[order.id] === undefined || drafts[order.id] === order.status}
                    isLoading={busyId === order.id}
                    onClick={() => void handleSave(order)}
                  >
                    Save
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
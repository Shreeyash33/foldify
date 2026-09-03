'use client';

import { useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { useToast } from '@/app/contexts/ToastContext';
import { listAdminOrders, updateOrderStatus } from '@/app/lib/api-client';
import { useFetchData } from '@/app/lib/hooks';
import { formatMoney } from '@/app/lib/utils';
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

const STATUS_OPTIONS = STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
}));

export function OrdersView() {
  const toast = useToast();
  // The admin list does not include items; keeping per-order change status is
  // enough for a first version.
  const { data: orders, error, reload } = useFetchData(listAdminOrders, 'Could not load the orders.');
  const [drafts, setDrafts] = useState<Record<number, OrderStatus>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

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
        <ErrorCard message={error} onRetry={reload} />
      ) : orders === null ? (
        <ListSkeleton count={4} lines={3} />
      ) : orders.length === 0 ? (
        <EmptyState message="No orders yet." />
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
                <p className="font-display text-lg text-ink">{formatMoney(order.totalMinor, { prefix: 'Rs. ' })}</p>
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
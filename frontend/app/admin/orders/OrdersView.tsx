'use client';

import { useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { useToast } from '@/app/contexts/ToastContext';
import { getOrder, listAdminOrders, updateOrderStatus } from '@/app/lib/api-client';
import { useFetchData } from '@/app/lib/hooks';
import { formatDate, formatMoney } from '@/app/lib/utils';
import type { AdminOrder, Order, OrderStatus } from '@foldify/shared';

type SortKey = 'newest' | 'oldest' | 'customerNameAsc' | 'totalDesc';

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

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'customerNameAsc', label: 'Customer (A–Z)' },
  { value: 'totalDesc', label: 'Total (high → low)' },
];

interface CustomerOption {
  email: string;
  name: string;
  count: number;
}

function buildCustomerOptions(orders: AdminOrder[]): { value: string; label: string }[] {
  const map = new Map<string, CustomerOption>();
  for (const o of orders) {
    const existing = map.get(o.customerEmail);
    if (existing !== undefined) {
      existing.count += 1;
    } else {
      map.set(o.customerEmail, { email: o.customerEmail, name: o.customerName, count: 1 });
    }
  }

  const seenNames = new Set<string>();
  for (const opt of map.values()) {
    seenNames.add(opt.name);
  }

  const hasDuplicateNames = seenNames.size < map.size;

  const options: { value: string; label: string }[] = [
    { value: '', label: 'All customers' },
  ];

  for (const opt of map.values()) {
    const label = hasDuplicateNames ? `${opt.name} (${opt.email})` : opt.name;
    options.push({ value: opt.email, label });
  }

  options.sort((a, b) => {
    if (a.value === '') return -1;
    if (b.value === '') return 1;
    return a.label.localeCompare(b.label);
  });

  return options;
}

export function OrdersView() {
  const toast = useToast();
  const { data: orders, error, reload } = useFetchData(listAdminOrders, 'Could not load the orders.');
  const [drafts, setDrafts] = useState<Record<number, OrderStatus>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [customerFilter, setCustomerFilter] = useState('');
  const [details, setDetails] = useState<Record<number, Order | undefined>>({});
  const [detailsError, setDetailsError] = useState<Record<number, string>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<number, boolean>>({});

  const setDraft = (id: number, status: OrderStatus) => {
    setDrafts((current) => ({ ...current, [id]: status }));
  };

  const toggleExpanded = (id: number) => {
    const wasExpanded = expandedIds.has(id);

    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if (!wasExpanded && details[id] === undefined && detailsError[id] === undefined && !detailsLoading[id]) {
      setDetailsLoading((current) => ({ ...current, [id]: true }));
      getOrder(id)
        .then((order) => {
          setDetails((current) => ({ ...current, [id]: order }));
        })
        .catch((cause: unknown) => {
          const message = cause instanceof Error ? cause.message : 'The order details could not be loaded.';
          setDetailsError((current) => ({ ...current, [id]: message }));
        })
        .finally(() => {
          setDetailsLoading((current) => ({ ...current, [id]: false }));
        });
    }
  };

  const sortedOrders =
    orders === null
      ? null
      : [...orders].sort((a, b) => {
          switch (sortKey) {
            case 'oldest':
              return a.createdAt.localeCompare(b.createdAt);
            case 'customerNameAsc':
              return a.customerName.localeCompare(b.customerName) || b.id - a.id;
            case 'totalDesc':
              return b.totalMinor - a.totalMinor;
            case 'newest':
            default:
              return b.createdAt.localeCompare(a.createdAt);
          }
        });

  const filteredOrders =
    sortedOrders === null || customerFilter === ''
      ? sortedOrders
      : sortedOrders.filter((order) => order.customerEmail === customerFilter);

  const customerOptions = orders === null ? [] : buildCustomerOptions(orders);

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

      <div className="flex justify-end">
        <div className="flex gap-2">
          <Select
            label="Sort by"
            options={SORT_OPTIONS}
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="w-48 sm:w-56"
          />
          <Select
            label="Filter by customer"
            options={customerOptions}
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
            className="w-48 sm:w-56"
          />
        </div>
      </div>

      {error !== null ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : filteredOrders === null ? (
        <ListSkeleton count={4} lines={3} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState message="No orders yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedIds.has(order.id);
            const orderDetails = details[order.id];
            const orderError = detailsError[order.id];
            const isLoadingDetails = detailsLoading[order.id] === true;
            return (
              <Card key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-crease px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Order #{order.id}</CardTitle>
                      <Badge
                        tone={
                          order.status === 'cancelled' || order.status === 'refunded'
                            ? 'danger'
                            : 'accent'
                        }
                        size="sm"
                      >
                        {STATUS_LABEL[order.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpanded(order.id)}
                      >
                        {isExpanded ? '▾ Hide details' : '▸ Details'}
                      </Button>
                    </div>
                    <CardMeta>
                      {order.customerName} &lt;{order.customerEmail}&gt; · {order.createdAt}
                    </CardMeta>
                  </div>
                  <p className="font-display text-lg text-ink">
                    {formatMoney(order.totalMinor, { prefix: 'Rs. ' })}
                  </p>
                </div>

                {isExpanded ? (
                  <>
                    <CardBody className="flex flex-col gap-4">
                      {isLoadingDetails ? (
                        <Skeleton shape="text" lines={4} />
                      ) : orderError !== undefined ? (
                        <p className="font-body text-sm text-beni">{orderError}</p>
                      ) : orderDetails !== undefined ? (
                        <>
                          <div className="flex flex-col gap-1">
                            <p className="font-body text-sm text-ink">
                              Ordered on {formatDate(orderDetails.createdAt)}
                            </p>
                          </div>

                          {orderDetails.items !== undefined && orderDetails.items.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              <table className="w-full font-body text-sm text-ink">
                                <thead>
                                  <tr className="border-b border-crease text-left text-ink-muted">
                                    <th className="pb-1 font-normal">Item</th>
                                    <th className="pb-1 font-normal text-right">Qty</th>
                                    <th className="pb-1 font-normal text-right">Unit price</th>
                                    <th className="pb-1 font-normal text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orderDetails.items.map((item) => (
                                    <tr key={item.id} className="border-b border-crease/50">
                                      <td className="py-1.5">{item.productName}</td>
                                      <td className="py-1.5 text-right">{item.quantity}</td>
                                      <td className="py-1.5 text-right">
                                        {formatMoney(item.unitPriceMinor, { prefix: 'Rs. ' })}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        {formatMoney(item.unitPriceMinor * item.quantity, {
                                          prefix: 'Rs. ',
                                        })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div className="flex items-center justify-between pt-1">
                                <span className="font-body text-sm font-medium text-ink">
                                  Grand total
                                </span>
                                <span className="font-display text-base text-ink">
                                  {formatMoney(orderDetails.totalMinor, { prefix: 'Rs. ' })}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      <div className="flex flex-col gap-1.5">
                        <p className="font-body text-sm text-ink">
                          To {order.shippingName}, {order.shippingCity} · {order.shippingPhone}
                        </p>
                        <p className="font-mono text-sm break-words text-ink-muted">
                          {order.shippingAddress}
                        </p>
                      </div>
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
                  </>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

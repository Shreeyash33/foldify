'use client';

import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardHeader, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { getAdminOverview } from '@/app/lib/api-client';
import { useFetchData } from '@/app/lib/hooks';

/** Count card: a single loud number over a small mono label. */
function CountCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">{label}</span>
        <span className={accent ? 'font-display text-3xl text-beni' : 'font-display text-3xl text-ink'}>
          {value}
        </span>
      </CardBody>
    </Card>
  );
}

export function OverviewView() {
  const { data: overview, error, reload } = useFetchData(
    getAdminOverview,
    'Could not load the overview.',
  );

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        description="Orders, stock and messages at a glance."
        actions={
          <>
            <Button href="/admin/items" variant="secondary" size="sm">
              Items
            </Button>
            <Button href="/admin/orders" variant="secondary" size="sm">
              Orders
            </Button>
            <Button href="/admin/inbox" variant="secondary" size="sm">
              Inbox
            </Button>
          </>
        }
      />

      {error !== null ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : overview === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Card key={index}>
              <CardBody className="flex flex-col gap-3">
                <Skeleton shape="text" className="w-1/2" />
                <Skeleton shape="title" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <CountCard label="Customers" value={String(overview.users)} />
            <CountCard label="Products" value={String(overview.products)} />
            <CountCard label="Live products" value={String(overview.publishedProducts)} />
            <CountCard label="Categories" value={String(overview.categories)} />
            <CountCard label="Tutorials" value={String(overview.tutorials)} />
            <CountCard label="Live tutorials" value={String(overview.publishedTutorials)} />
            <CountCard label="Reviews" value={String(overview.reviews)} />
            <CountCard label="Orders" value={String(overview.orders)} />
            <CountCard label="Pending orders" value={String(overview.ordersPending)} accent />
            <CountCard label="Unhandled inbox" value={String(overview.contactUnhandled)} accent />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Where things stand</CardTitle>
              <CardMeta>
                The only true numbers come from the store — this card keeps the pace.
              </CardMeta>
            </CardHeader>
            <CardBody className="flex flex-col gap-4 sm:flex-row">
              <Button href="/admin/items" variant="secondary" size="sm">
                Edit the catalogue
              </Button>
              <Button href="/admin/orders" variant="secondary" size="sm">
                Work the order queue
              </Button>
              <Button href="/admin/inbox" variant="secondary" size="sm">
                Check the inbox
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
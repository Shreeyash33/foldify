import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardMedia, CardTitle } from '@/app/components/ui/Card';
import { CreaseDivider } from '@/app/components/ui/CreaseDivider';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { getProduct } from '@/app/lib/api-client';
import { getProductShell } from '@/app/lib/catalogue';
import { formatPrice } from '@/app/lib/utils';
import { AddToCart } from './AddToCart';
import { ReviewsSection } from './ReviewsSection';

/**
 * Partial prerendering, split by how fast the data goes stale.
 *
 * The shell — name, description, imagery, category — comes from the hour-long
 * catalogue cache and is prerendered per slug at build time. Price, stock and
 * the add-to-cart control are read live on every request inside their own
 * boundary, because a cached page must never be the thing that tells someone
 * what an item costs or whether it is still in stock.
 */

export function ProductShellSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton shape="title" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton shape="block" />
        <div className="flex flex-col gap-3">
          <Skeleton shape="text" lines={4} />
        </div>
      </div>
    </div>
  );
}

function LivePricingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton shape="text" />
      <Skeleton shape="text" />
    </div>
  );
}

async function LivePricing({ slug }: { slug: string }) {
  let product;
  try {
    // Uncached on purpose — this is the dynamic hole in the prerendered page.
    product = await getProduct(slug);
  } catch {
    return <p>Price and availability are unavailable right now.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{formatPrice(product.priceMinor, product.currency)}</Badge>
        {product.stock > 0 ? (
          <Badge tone="cardboard">{product.stock} in stock</Badge>
        ) : (
          <Badge tone="danger">Sold out</Badge>
        )}
      </div>

      <AddToCart product={product} />
    </div>
  );
}

export async function ProductShell({ params }: { params: Promise<{ id: string }> }) {
  // The route segment is the slug, not the numeric id.
  const { id: slug } = await params;

  let product;
  try {
    product = await getProductShell(slug);
  } catch {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>This model could not be loaded right now. Please try again shortly.</p>
        </CardBody>
      </Card>
    );
  }

  if (product === null) notFound();

  // Guarded with a default: the cached shell can predate the links field, so a
  // stale entry serves `undefined` here even though the type says otherwise.
  const linkedTutorials = product.linkedTutorials ?? [];
  const firstTutorial = linkedTutorials[0];

  return (
    <>
      <PageHeader
        title={product.name}
        eyebrow={product.categoryName ?? 'Products'}
        description={product.description}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardMedia src={product.imageUrl} alt={product.name} priority />
        </Card>

        <div className="flex flex-col gap-4">
          {firstTutorial !== undefined && (
            <Card>
              <CardBody className="flex flex-col gap-2">
                <Badge tone="accent">Try it yourself</Badge>
                <p>
                  This fold is taught step by step in the tutorial{' '}
                  <span className="font-medium">
                    {linkedTutorials.map((tutorial) => tutorial.title).join(', ')}
                  </span>
                  .
                </p>
                <Button
                  href={`/learn/${firstTutorial.slug}`}
                  variant="secondary"
                  size="sm"
                  className="self-start"
                >
                  Fold it yourself
                </Button>
              </CardBody>
            </Card>
          )}

          <Badge tone="cardboard">{product.difficulty}</Badge>

          <Suspense fallback={<LivePricingSkeleton />}>
            <LivePricing slug={slug} />
          </Suspense>
        </div>
      </div>

      <CreaseDivider variant="valley" />

      <section className="flex flex-col gap-4">
        <CardTitle>Reviews</CardTitle>
        <ReviewsSection slug={slug} />
      </section>
    </>
  );
}

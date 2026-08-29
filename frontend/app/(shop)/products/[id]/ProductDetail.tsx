import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Card, CardBody, CardMedia, CardTitle } from '@/app/components/ui/Card';
import { CreaseDivider } from '@/app/components/ui/CreaseDivider';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { getProduct } from '@/app/lib/api-client';
import { getProductShell } from '@/app/lib/catalogue';
import { formatDate, formatPrice } from '@/app/lib/utils';
import { AddToCart } from './AddToCart';

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

async function ReviewList({ slug }: { slug: string }) {
  let detail;
  try {
    detail = await getProductShell(slug);
  } catch {
    return <p>Reviews could not be loaded.</p>;
  }

  if (detail === null) return null;

  if (detail.reviews.length === 0) {
    return <p>No reviews yet. Fold it first and tell everyone how it went.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{detail.averageRating.toFixed(1)} average</Badge>
        <Badge tone="neutral">
          {detail.reviewCount} review{detail.reviewCount === 1 ? '' : 's'}
        </Badge>
      </div>

      {detail.reviews.map((review) => (
        <Card key={review.id}>
          <CardBody className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{review.authorName ?? 'A folder'}</CardTitle>
              <Badge tone="neutral" size="sm">
                {review.rating} / 5
              </Badge>
              <Badge tone="neutral" size="sm">
                {formatDate(review.createdAt)}
              </Badge>
            </div>
            <p>{review.body}</p>
          </CardBody>
        </Card>
      ))}
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
          <Badge tone="cardboard">{product.difficulty}</Badge>

          <Suspense fallback={<LivePricingSkeleton />}>
            <LivePricing slug={slug} />
          </Suspense>
        </div>
      </div>

      <CreaseDivider variant="valley" />

      <section className="flex flex-col gap-4">
        <CardTitle>Reviews</CardTitle>
        <Suspense fallback={<Skeleton shape="text" lines={3} />}>
          <ReviewList slug={slug} />
        </Suspense>
      </section>
    </>
  );
}

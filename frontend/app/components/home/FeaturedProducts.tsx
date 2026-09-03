'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { listProducts, ApiClientError } from '@/app/lib/api-client';
import { ProductCard } from '@/app/(shop)/products/ProductCard';

/**
 * The curated strip on the homepage.
 *
 * Client-fetched so the static hero shell never depends on the API at build
 * time: with the backend stopped the landing page still renders, and only this
 * strip shows a skeleton. Sold-out rows are skipped so the homepage never
 * routes a buyer to an out-of-stock card; a thin catalogue simply draws fewer
 * cards rather than leaving a blank gap.
 */

/** One row, at most four columns, so the cards stay small on the homepage. */
const FEATURED_COUNT = 4;
/** Fetch a few extra so we can skip sold-out rows and still hit the target. */
const FETCH_PAGE_SIZE = 12;

export function FeaturedProductsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <Skeleton shape="block" />
          <CardBody className="flex flex-col gap-2">
            <Skeleton shape="title" />
            <Skeleton shape="text" lines={2} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isStale = false;

    listProducts({ perPage: FETCH_PAGE_SIZE })
      .then((page) => {
        if (!isStale) {
          setError(null);
          setProducts(page.items);
        }
      })
      .catch((cause: unknown) => {
        if (!isStale) {
          setProducts(null);
          setError(
            cause instanceof ApiClientError && cause.isNetworkFailure
              ? 'The shop is not reachable right now. Start the API and reload.'
              : 'The featured pieces could not be loaded. Please try again shortly.',
          );
        }
      });

    return () => {
      isStale = true;
    };
  }, []);

  if (error !== null) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>{error}</p>
          <Button href="/products" variant="secondary" size="sm">
            Browse the shop
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (products === null) return <FeaturedProductsSkeleton />;

  const featured = pickFeatured(products);

  if (featured.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <p>Nothing is on the shelf just now.</p>
          <Button href="/products" variant="secondary" size="sm">
            Browse the shop
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {featured.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/** A short, currently-buyable spread across the first catalogue page, sales first. */
function pickFeatured(products: Product[]): Product[] {
  const inStock = products.filter((product) => product.stock > 0);
  const onSale = inStock.filter((product) => product.compareAtPriceMinor !== null);
  const fullPrice = inStock.filter((product) => product.compareAtPriceMinor === null);
  return [...onSale, ...fullPrice].slice(0, FEATURED_COUNT);
}

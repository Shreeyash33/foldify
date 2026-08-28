import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ProductControls, ProductControlsSkeleton } from './ProductControls';
import { ProductGrid, ProductGridSkeleton, type ProductSearchParams } from './ProductGrid';

export const metadata: Metadata = { title: 'Shop' };

/**
 * Static shell, streamed grid.
 *
 * The header and the filter controls are the same for everyone and are
 * prerendered. Only the grid depends on the query string, so it is the only
 * part behind a Suspense boundary — the catalogue itself is cached for an hour
 * in lib/catalogue.ts rather than re-read per visitor.
 */
export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>;
}) {
  return (
    <Container width="wide" className="flex flex-col gap-6 pb-16">
      <PageHeader
        title="Shop"
        eyebrow="Products"
        description="Folded origami — animals, flowers, modular and vessels — by fold difficulty."
      />

      {/* Reads the query string, so it streams alongside the grid rather than
          blocking the header from prerendering. */}
      <Suspense fallback={<ProductControlsSkeleton />}>
        <ProductControls />
      </Suspense>

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

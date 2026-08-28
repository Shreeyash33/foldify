import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/app/components/layout/Container';
import { getProductShell } from '@/app/lib/catalogue';
import { ProductShell, ProductShellSkeleton } from './ProductDetail';

/**
 * There is deliberately no `generateStaticParams` here.
 *
 * Baking one page per slug would need the API reachable during `npm run build`,
 * and under Cache Components an empty result is a hard build error rather than
 * "prerender nothing" — so a teammate building with the backend stopped would
 * be unable to build at all. The shell is cached for an hour in
 * lib/catalogue.ts instead, which keeps the shared-across-visitors win without
 * making the build depend on a running server.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await getProductShell(id);
    if (product === null) return { title: 'Product not found' };
    return { title: product.name, description: product.description };
  } catch {
    return { title: 'Product' };
  }
}

/**
 * `params` is deliberately not awaited here. With the API unreachable at build
 * time there are no static params, and awaiting it in the page body would make
 * the whole route uncached-dynamic and fail the `cacheComponents` build. Held
 * behind Suspense, the shell still prerenders for every slug that was known.
 */
export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Container width="default" className="flex flex-col gap-6 pb-16">
      <Suspense fallback={<ProductShellSkeleton />}>
        <ProductShell params={params} />
      </Suspense>
    </Container>
  );
}

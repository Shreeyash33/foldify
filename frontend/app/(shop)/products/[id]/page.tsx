import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Product' };

/**
 * In Next 16 `params` is a Promise and must be awaited — synchronous access
 * was removed. Every dynamic page in this project follows this shape.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ComingSoon
      title="Product detail"
      eyebrow={`Products / ${id}`}
      description="One product, its description, stock, reviews and an add-to-cart control."
      notes={[
        'getProduct(slug) from lib/api-client. The segment is the slug, not the numeric id.',
        'add() from useCart() puts it in the cart; the navbar badge updates itself.',
        'Photography goes through next/image — never a bare <img>.',
        'Reviews list is a separate endpoint; build the page without it first.',
      ]}
    />
  );
}

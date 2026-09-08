import type { Product } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { CardMeta } from '@/app/components/ui/Card';
import { MediaCard } from '@/app/components/cards/MediaCard';
import { formatPrice } from '@/app/lib/utils';

/**
 * Price sits in a Badge because the design system puts prices and data in the
 * mono face, and a Badge is the only closed component that provides it —
 * reaching for `font-mono` here would be a page restyling the design system.
 */
export function ProductCard({ product }: { product: Product }) {
  const isSoldOut = product.stock === 0;

  return (
    <MediaCard
      href={`/products/${product.slug}`}
      imageSrc={product.imageUrl}
      imageAlt={product.name}
      title={product.name}
      footer={
        <>
          <Badge tone="neutral">{formatPrice(product.priceMinor, product.currency)}</Badge>
          {product.compareAtPriceMinor !== null && product.compareAtPriceMinor > product.priceMinor ? (
            <span className="font-mono text-xs text-ink-muted line-through">
              {formatPrice(product.compareAtPriceMinor, product.currency)}
            </span>
          ) : null}
        </>
      }
    >
      {product.categoryName !== undefined ? <CardMeta>{product.categoryName}</CardMeta> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cardboard" size="sm">
          {product.difficulty}
        </Badge>
        {isSoldOut ? (
          <Badge tone="danger" size="sm">
            Sold out
          </Badge>
        ) : null}
      </div>
    </MediaCard>
  );
}

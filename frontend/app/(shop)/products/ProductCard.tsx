import Link from 'next/link';
import type { Product } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import {
  Card,
  CardBody,
  CardFooter,
  CardMedia,
  CardMeta,
  CardTitle,
} from '@/app/components/ui/Card';
import { formatPrice } from '@/app/lib/utils';

/**
 * Price sits in a Badge because the design system puts prices and data in the
 * mono face, and a Badge is the only closed component that provides it —
 * reaching for `font-mono` here would be a page restyling the design system.
 */
export function ProductCard({ product }: { product: Product }) {
  const isSoldOut = product.stock === 0;

  return (
    <Card interactive className="h-full">
      <Link href={`/products/${product.slug}`} className="flex h-full flex-col">
        <CardMedia src={product.imageUrl} alt={product.name} />

        <CardBody className="flex flex-col gap-2">
          <CardTitle>{product.name}</CardTitle>
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
        </CardBody>

        <CardFooter>
          <Badge tone="neutral">{formatPrice(product.priceMinor, product.currency)}</Badge>
        </CardFooter>
      </Link>
    </Card>
  );
}

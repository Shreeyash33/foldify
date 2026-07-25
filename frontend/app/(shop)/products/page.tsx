import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Shop' };

export default function ProductsPage() {
  return (
    <ComingSoon
      title="Shop"
      eyebrow="Products"
      description="Paper, kits, tools and books, filterable by category and difficulty."
      notes={[
        'listProducts() from lib/api-client returns Paginated<Product>; it already works against the live API.',
        'One <Card interactive> per product in a responsive grid — 1 column at 375px, 2 at 768px, 3 or 4 at 1440px.',
        'Prices go through formatPrice() from lib/utils. Never render priceMinor directly.',
        'Use <Skeleton shape="block"> for the loading state, not a spinner over the whole page.',
      ]}
    />
  );
}

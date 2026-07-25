import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Cart' };

export default function CartPage() {
  return (
    <ComingSoon
      title="Cart"
      eyebrow="Shop"
      description="Everything you have picked up, before checkout."
      notes={[
        'Everything comes from useCart() — items, updateQty, remove, clear, subtotalMinor.',
        'The cart is entirely client-side and persisted to localStorage. There is no cart endpoint.',
        'Show an empty state with a link back to /products; do not render an empty table.',
        'The subtotal here is display-only. The server recomputes every price at checkout.',
      ]}
    />
  );
}

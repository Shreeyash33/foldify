import type { Metadata } from 'next';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { CartView } from './CartView';

export const metadata: Metadata = { title: 'Cart' };

/**
 * Dynamic by nature rather than by configuration: the cart lives entirely in
 * localStorage, so there is nothing server-side to cache and no endpoint to
 * call. The shell prerenders and the contents arrive on hydration.
 */
export default function CartPage() {
  return (
    <Container width="default" className="flex flex-col gap-6 pb-16">
      <PageHeader
        title="Cart"
        eyebrow="Shop"
        description="Everything you have picked up, before checkout."
      />

      <CartView />
    </Container>
  );
}

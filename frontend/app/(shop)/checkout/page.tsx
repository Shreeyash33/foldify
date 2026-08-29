import type { Metadata } from 'next';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { CheckoutView } from './CheckoutView';

export const metadata: Metadata = { title: 'Checkout' };

/** Auth-gated and cart-dependent: nothing here is cached for anyone. */
export default function CheckoutPage() {
  return (
    <Container width="wide" className="flex flex-col gap-6 pb-16">
      <PageHeader title="Checkout" eyebrow="Shop" description="Shipping details, then payment." />

      <CheckoutView />
    </Container>
  );
}

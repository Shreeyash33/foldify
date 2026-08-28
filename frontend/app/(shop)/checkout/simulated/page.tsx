import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PaymentReturn } from './PaymentReturn';

export const metadata: Metadata = { title: 'Payment' };

export default function SimulatedPaymentPage() {
  return (
    <Container width="narrow" className="flex flex-col gap-6 pb-16">
      <PageHeader
        title="Payment"
        eyebrow="Checkout"
        description="Confirming the order with the payment provider."
      />

      <Suspense fallback={<Skeleton shape="block" />}>
        <PaymentReturn />
      </Suspense>
    </Container>
  );
}

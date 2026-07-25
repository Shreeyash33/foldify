import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return (
    <ComingSoon
      title="Checkout"
      eyebrow="Shop"
      description="Shipping details, then payment."
      notes={[
        'Requires a signed-in user — check useAuth() and honour isLoading before redirecting.',
        'POST /api/orders takes product ids and quantities ONLY. Never send a total; the server computes it.',
        'Payment is a simulated gateway for now (services/payment.service.ts). eSewa or Khalti replaces it later.',
        'Clear the cart with clear() only after the order comes back successfully.',
      ]}
    />
  );
}

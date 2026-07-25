import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <ComingSoon
      title="Profile"
      eyebrow="Account"
      description="Your details and your past orders."
      notes={[
        'user and logout come from useAuth(). Honour isLoading — do not flash a signed-out state.',
        'GET /api/orders returns the signed-in user’s own orders and already works.',
        'Order status maps neatly onto <Badge tone>.',
      ]}
    />
  );
}

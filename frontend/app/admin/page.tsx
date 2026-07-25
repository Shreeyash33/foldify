import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Admin' };

export default function AdminPage() {
  return (
    <ComingSoon
      contained={false}
      title="Overview"
      eyebrow="Admin"
      description="Orders, stock and traffic at a glance."
      notes={[
        'The product_views and tutorial_views tables exist for exactly this.',
        'Every admin endpoint must sit behind requireAuth + requireAdmin on the server.',
        'Keep charts out of the first version — counts in <Card>s are enough to be useful.',
      ]}
    />
  );
}

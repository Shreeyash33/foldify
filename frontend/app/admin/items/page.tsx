import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Admin · Items' };

export default function AdminItemsPage() {
  return (
    <ComingSoon
      contained={false}
      title="Items"
      eyebrow="Admin"
      description="Create, edit and unpublish products."
      notes={[
        'Deleting is a soft delete — set is_published = 0. order_items references the row.',
        'The create and edit forms are the same <Modal> with different initial values.',
        'Prices are entered in rupees and stored in paisa. Multiply by 100 exactly once, on the way in.',
      ]}
    />
  );
}

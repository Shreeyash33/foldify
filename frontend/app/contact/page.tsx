import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <ComingSoon
      title="Contact"
      eyebrow="Foldify"
      description="Questions about an order, a model, or the paper itself."
      notes={[
        'POST /api/contact is fully implemented — this is the easiest page to finish first.',
        '<Input> for name, email and subject; <Textarea> for the message.',
        'Validation errors come back in error.fields keyed by field name; pass each to the matching error prop.',
        'toast.success() on submit, then reset the form.',
      ]}
    />
  );
}

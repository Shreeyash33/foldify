import type { Metadata } from 'next';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ContactView } from './ContactView';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <Container width="wide" className="flex flex-col gap-6 pb-16">
      <PageHeader
        title="Contact"
        eyebrow="Foldify"
        description="Questions about an order, a model, or the paper itself."
      />

      <ContactView />
    </Container>
  );
}
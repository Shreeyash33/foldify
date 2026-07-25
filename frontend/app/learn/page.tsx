import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Learn' };

export default function LearnPage() {
  return (
    <ComingSoon
      title="Learn"
      eyebrow="Tutorials"
      description="Step-by-step folds, from the traditional crane upward."
      notes={[
        'listTutorials() from lib/api-client; the endpoint already works.',
        'Show difficulty with <Badge> and length with formatDuration() from lib/utils.',
        'Cards link to /learn/[slug].',
      ]}
    />
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { TutorialGrid, type TutorialSearchParams, TutorialGridSkeleton } from './TutorialGrid';

export const metadata: Metadata = { title: 'Learn' };

/**
 * Static shell with a streamed grid — same skeleton as the shop. Like the
 * products grid, it defends against a backend-down build by awaiting
 * `searchParams` inside the boundary first: that makes the grid a delayed
 * cacheComponents hole (◐), so the cached catalogue call only happens at
 * runtime, never during prerender with the API stopped.
 */
export default function LearnPage({
  searchParams,
}: {
  searchParams: Promise<TutorialSearchParams>;
}) {
  return (
    <Container width="wide" className="flex flex-col gap-6 pb-16">
      <PageHeader
        title="Learn"
        eyebrow="Tutorials"
        description="Step-by-step folds, from the traditional crane upward."
      />

      <Suspense fallback={<TutorialGridSkeleton />}>
        <TutorialGrid searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
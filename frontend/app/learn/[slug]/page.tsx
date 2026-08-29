import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ComingSoon } from '@/app/components/layout/ComingSoon';
import { Skeleton } from '@/app/components/ui/Skeleton';

export const metadata: Metadata = { title: 'Tutorial' };

/**
 * Still a scaffold — the tutorial itself is not built yet.
 *
 * `params` is read inside the boundary rather than in the page body because
 * `cacheComponents` treats an awaited param on a route with no static params as
 * uncached dynamic access, which blocks the whole route from prerendering.
 */
async function TutorialStub({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <ComingSoon
      title="Tutorial"
      eyebrow={`Learn / ${slug}`}
      description="One model, one step at a time."
      notes={[
        'getTutorial(slug) returns the tutorial with its ordered steps.',
        'Number each step in the mono face and label its foldType with <CreaseDivider variant="valley" | "mountain">.',
        'The animated fold player is NOT part of this scaffold — the CraftFile format is still provisional.',
        'A static step list that works is worth more than an animation that does not.',
      ]}
    />
  );
}

export default function TutorialPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<Skeleton shape="block" />}>
      <TutorialStub params={params} />
    </Suspense>
  );
}

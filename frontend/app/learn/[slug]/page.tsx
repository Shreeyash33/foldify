import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Tutorial' };

export default async function TutorialPage({ params }: { params: Promise<{ slug: string }> }) {
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

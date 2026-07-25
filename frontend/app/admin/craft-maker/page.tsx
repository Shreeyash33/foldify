import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Admin · Craft Maker' };

export default function CraftMakerPage() {
  return (
    <ComingSoon
      contained={false}
      title="Craft Maker"
      eyebrow="Admin"
      description="The fold authoring tool. Not started, and deliberately so."
      notes={[
        'Blocked on an animation spike: we do not yet know what the player needs to render.',
        'The CraftFile type in shared/types.ts is a placeholder — do not design the fold format around it.',
        '<ResizablePanel> was built with this screen in mind: canvas on one side, controls on the other.',
        'Do the spike first. Anything built before it will be rewritten.',
      ]}
    />
  );
}

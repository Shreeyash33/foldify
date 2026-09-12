import { Suspense } from 'react';
import { LearnCheck } from './learn-layout-content';

/**
 * /learn chrome: no page chrome of its own — the pages render their own layout.
 *
 * The server runs the sign-in check (LearnCheck) inside a Suspense boundary
 * because the check is dynamic, and the gate renders children unconditionally
 * so the segment is never dropped from instant navigation. Any signed-in
 * member — admin or customer — may view it.
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <LearnCheck>{children}</LearnCheck>
    </Suspense>
  );
}

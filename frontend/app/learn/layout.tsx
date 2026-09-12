import { Suspense } from 'react';
<<<<<<< HEAD
import { LearnGate } from './LearnGate';

/**
 * Learn chrome: no page chrome of its own — the pages render their own layout.
 *
 * LearnGate is the client-side access check. It honours useAuth().isLoading so
 * a signed-in user never flashes the signed-out branch, and redirects
 * signed-out visitors to /login. Any signed-in member — admin or customer —
 * may view it. The gate reads uncached dynamic data (usePathname/useRouter)
 * while the detail page is a dynamic route, so it must sit inside a Suspense
 * boundary or Next refuses to prerender the shell.
=======
import { LearnCheck } from './learn-layout-content';

/**
 * /learn chrome: no page chrome of its own — the pages render their own layout.
 *
 * The server runs the sign-in check (LearnCheck) inside a Suspense boundary
 * because the check is dynamic, and the gate renders children unconditionally
 * so the segment is never dropped from instant navigation. Any signed-in
 * member — admin or customer — may view it.
>>>>>>> auditbranch
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
<<<<<<< HEAD
      <LearnGate>{children}</LearnGate>
=======
      <LearnCheck>{children}</LearnCheck>
>>>>>>> auditbranch
    </Suspense>
  );
}

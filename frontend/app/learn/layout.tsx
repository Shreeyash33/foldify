import { Suspense } from 'react';
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
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <LearnGate>{children}</LearnGate>
    </Suspense>
  );
}

'use client';

<<<<<<< HEAD
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { useAuth } from '@/app/contexts/AuthContext';

/**
 * The client-side access check for the learn pages.
 *
 * Tutorial endpoints and the cached catalogue shell are public; this gate is
 * the lock. It hides the learn pages from signed-out visitors (redirect to
 * sign in) while honouring `useAuth().isLoading` so a signed-in user never
 * flashes the signed-out branch on load. Any signed-in member — admin or
 * customer — may view it.
 */
export function LearnGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <Skeleton shape="title" />
          <Skeleton shape="text" lines={3} />
        </CardBody>
      </Card>
    );
  }

  if (user === null) {
    // The redirect above fires; render nothing for the single frame between.
    return null;
  }

=======
import type { ReactNode } from 'react';

/**
 * Client-side presentation guard for the learn pages. The authorization check
 * itself is done on the server (learn-layout-content's LearnCheck), so this
 * wrapper exists only to keep the server layout Out-of-Order/instant-nav
 * friendly: it is configured with the request-time role and always renders its
 * children, never replacing them with a loading skeleton.
 */
export default function LearnGate({ children }: { children: ReactNode }) {
>>>>>>> auditbranch
  return <>{children}</>;
}

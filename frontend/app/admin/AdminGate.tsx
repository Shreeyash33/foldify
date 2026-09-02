'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { useAuth } from '@/app/contexts/AuthContext';

/**
 * The client-side half of the admin access check.
 *
 * The server is the authority: every admin endpoint sits behind
 * requireAdmin, so this gate only decides what the UI shows. It hides the
 * admin pages from signed-out visitors (redirect to sign in) and from
 * customers (an access-denied card), while honouring `useAuth().isLoading`
 * so a signed-in admin never flashes the signed-out branch on load.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
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

  if (user.role !== 'admin') {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Access denied</Badge>
          <p>Your account does not have admin access. Sign in with an admin account to use this section.</p>
          <Button href="/" variant="secondary" size="sm">
            Back to the site
          </Button>
        </CardBody>
      </Card>
    );
  }

  return <>{children}</>;
}
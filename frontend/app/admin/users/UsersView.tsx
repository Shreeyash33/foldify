'use client';

import { useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { listAdminUsers, updateUserRole } from '@/app/lib/api-client';
import { useFetchData } from '@/app/lib/hooks';
import { formatMoney } from '@/app/lib/utils';
import type { AdminUser } from '@foldify/shared';

/** Paisa → a short total like "Rs. 1,85,000 spent". */
function formatSpent(minor: number): string {
  if (minor <= 0) return 'Nothing yet';
  return formatMoney(minor, { prefix: 'Rs. ', suffix: ' spent' });
}

export function UsersView() {
  const toast = useToast();
  const { user: me } = useAuth();
  const { data: users, error, reload } = useFetchData(listAdminUsers, 'Could not load the customers.');
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleRoleChange = async (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'customer' : 'admin';
    const verb = nextRole === 'admin' ? 'promote' : 'demote';

    if (
      !window.confirm(
        nextRole === 'admin'
          ? `Make ${user.name} an admin? They will be able to manage the whole store.`
          : `Demote ${user.name} to a customer? They will lose admin access.`,
      )
    ) {
      return;
    }

    setBusyId(user.id);
    try {
      const updated = await updateUserRole(user.id, nextRole);
      toast.success(`${updated.name} is now a ${updated.role}.`);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : `Could not ${verb} that user.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Who has an account, what they have spent, and what their role is."
      />

      {error !== null ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : users === null ? (
        <ListSkeleton count={4} lines={2} />
      ) : users.length === 0 ? (
        <EmptyState message="No accounts yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {me?.id === user.id ? (
                      <span className="size-2 rounded-full bg-indigo" aria-label="This is you" />
                    ) : null}
                    <span className="font-display text-lg text-ink">{user.name}</span>
                    <Badge tone={user.role === 'admin' ? 'accent' : 'neutral'} size="sm">
                      {user.role}
                    </Badge>
                    {me?.id === user.id ? (
                      <Badge tone="cardboard" size="sm">
                        You
                      </Badge>
                    ) : null}
                  </div>
                  <p className="font-mono text-sm text-ink-muted">{user.email}</p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-2">
                  <p className="font-body text-sm text-ink">
                    {user.orderCount} order{user.orderCount === 1 ? '' : 's'}
                    <span className="text-ink-muted"> · {formatSpent(user.totalSpentMinor)}</span>
                  </p>
                  <div className="flex gap-2">
                    {me?.id === user.id ? (
                      <Button variant="ghost" size="sm" disabled title="You cannot change your own role.">
                        Promote
                      </Button>
                    ) : user.role === 'admin' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={busyId === user.id}
                        onClick={() => void handleRoleChange(user)}
                      >
                        Demote
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={busyId === user.id}
                        onClick={() => void handleRoleChange(user)}
                      >
                        Promote
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
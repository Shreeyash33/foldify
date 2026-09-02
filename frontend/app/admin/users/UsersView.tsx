'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { listAdminUsers, updateUserRole } from '@/app/lib/api-client';
import type { AdminUser } from '@foldify/shared';

/** Paisa → a short total like "Rs. 1,85,000". */
function formatSpent(minor: number): string {
  if (minor <= 0) return 'Nothing yet';
  return `Rs. ${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} spent`;
}

export function UsersView() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const applyData = useCallback((data: AdminUser[]) => {
    setError(null);
    setUsers(data);
  }, []);

  const applyError = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Could not load the customers.');
  }, []);

  useEffect(() => {
    let isStale = false;
    listAdminUsers()
      .then((data) => {
        if (!isStale) applyData(data);
      })
      .catch((cause: unknown) => {
        if (!isStale) applyError(cause);
      });
    return () => {
      isStale = true;
    };
  }, [applyData, applyError]);

  const reload = useCallback(() => {
    listAdminUsers().then(applyData).catch(applyError);
  }, [applyData, applyError]);

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
        <Card>
          <CardBody className="flex flex-col items-start gap-3">
            <Badge tone="danger">Problem</Badge>
            <p>{error}</p>
            <Button onClick={() => void reload()} variant="secondary" size="sm">
              Try again
            </Button>
          </CardBody>
        </Card>
      ) : users === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <CardBody className="flex flex-col gap-3">
                <Skeleton shape="title" />
                <Skeleton shape="text" lines={2} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardBody>
            <p>No accounts yet.</p>
          </CardBody>
        </Card>
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
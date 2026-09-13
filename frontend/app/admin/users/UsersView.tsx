'use client';

import { Badge } from '@/app/components/ui/Badge';
import { Card, CardBody } from '@/app/components/ui/Card';
import { DropdownMenu, type DropdownMenuItem } from '@/app/components/ui/DropdownMenu';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import {
  listAdminUsers,
  updateUserRole,
  setUserBanned,
  setUserDeleted,
  resetUserPassword,
} from '@/app/lib/api-client';
import { useFetchData } from '@/app/lib/hooks';
import { formatMoney, formatTimeAgo } from '@/app/lib/utils';
import type { AdminUser } from '@foldify/shared';

function formatSpent(minor: number): string {
  if (minor <= 0) return 'Nothing yet';
  return formatMoney(minor, { prefix: 'Rs. ', suffix: ' spent' });
}

export function UsersView() {
  const toast = useToast();
  const { user: me } = useAuth();
  const { data: users, error, reload } = useFetchData(listAdminUsers, 'Could not load the customers.');

  const handleRoleChange = async (target: AdminUser) => {
    const nextRole = target.role === 'admin' ? 'customer' : 'admin';
    const verb = nextRole === 'admin' ? 'promote' : 'demote';

    if (
      !window.confirm(
        nextRole === 'admin'
          ? `Make ${target.name} an admin? They will be able to manage the whole store.`
          : `Demote ${target.name} to a customer? They will lose admin access.`,
      )
    ) {
      return;
    }

    try {
      const updated = await updateUserRole(target.id, nextRole);
      toast.success(`${updated.name} is now a ${updated.role}.`);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : `Could not ${verb} that user.`);
    }
  };

  const handleBan = async (target: AdminUser) => {
    const isBanning = target.bannedAt === null;
    if (
      !window.confirm(
        isBanning
          ? `Ban ${target.name}? Their sessions will be invalidated.`
          : `Unban ${target.name}?`,
      )
    ) {
      return;
    }

    try {
      await setUserBanned(target.id, isBanning);
      toast.success(isBanning ? `${target.name} has been banned.` : `${target.name} has been unbanned.`);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update ban status.');
    }
  };

  const handleDelete = async (target: AdminUser) => {
    const isDeleting = target.deletedAt === null;
    if (
      !window.confirm(
        isDeleting
          ? `Soft-delete ${target.name}? Their account will be hidden from normal use.`
          : `Restore ${target.name}'s account?`,
      )
    ) {
      return;
    }

    try {
      await setUserDeleted(target.id, isDeleting);
      toast.success(isDeleting ? `${target.name}'s account has been deleted.` : `${target.name}'s account has been restored.`);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update account status.');
    }
  };

  const handleResetPassword = async (target: AdminUser) => {
    if (!window.confirm(`Reset ${target.name}'s password? They will receive a temporary password.`)) {
      return;
    }

    try {
      const result = await resetUserPassword(target.id);
      window.alert(`Temporary password for ${target.name}: ${result.temporaryPassword}`);
      toast.success(`Password reset for ${target.name}.`);
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not reset password.');
    }
  };

  const buildMenuItems = (user: AdminUser): DropdownMenuItem[] => {
    const isSelf = me?.id === user.id;

    return [
      {
        label: 'Promote to admin',
        hidden: user.role !== 'customer' || isSelf,
        onClick: () => void handleRoleChange(user),
      },
      {
        label: 'Demote to customer',
        hidden: user.role !== 'admin' || isSelf,
        tone: 'danger',
        onClick: () => void handleRoleChange(user),
      },
      {
        label: 'Ban user',
        hidden: user.bannedAt !== null || isSelf,
        tone: 'danger',
        onClick: () => void handleBan(user),
      },
      {
        label: 'Unban user',
        hidden: user.bannedAt === null,
        onClick: () => void handleBan(user),
      },
      {
        label: 'Delete account',
        hidden: user.deletedAt !== null || isSelf,
        tone: 'danger',
        onClick: () => void handleDelete(user),
      },
      {
        label: 'Restore account',
        hidden: user.deletedAt === null,
        onClick: () => void handleDelete(user),
      },
      {
        label: 'Reset password',
        hidden: isSelf,
        onClick: () => void handleResetPassword(user),
      },
    ];
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
                    {user.bannedAt !== null ? (
                      <Badge tone="danger" size="sm">Banned</Badge>
                    ) : null}
                    {user.deletedAt !== null ? (
                      <Badge tone="neutral" size="sm">Deleted</Badge>
                    ) : null}
                  </div>
                  <p
                    className={`font-mono text-sm ${
                      user.bannedAt !== null || user.deletedAt !== null
                        ? 'text-ink-muted line-through'
                        : 'text-ink-muted'
                    }`}
                  >
                    {user.email}
                  </p>
                  <p className="font-body text-xs text-ink-muted">
                    Last active: {formatTimeAgo(user.lastActiveAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-2">
                  <p className="font-body text-sm text-ink">
                    {user.orderCount} order{user.orderCount === 1 ? '' : 's'}
                    <span className="text-ink-muted"> · {formatSpent(user.totalSpentMinor)}</span>
                  </p>
                  <DropdownMenu
                    trigger={<span aria-hidden="true">⋯</span>}
                    triggerLabel={`Actions for ${user.name}`}
                    items={buildMenuItems(user)}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

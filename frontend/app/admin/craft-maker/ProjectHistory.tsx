'use client';

import { useEffect, useState } from 'react';
import type { CraftFileVersion } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { listCraftFileVersions } from '@/app/lib/api-client';
import { formatDate } from '@/app/lib/utils';

/**
 * Saved revisions of one project, newest first. Restoring throws away unsaved
 * work, so this only asks: the parent owns the confirm modal and the actual
 * restore call, and bumps `refreshToken` when the history changes.
 *
 * Keyed on the project id by the parent, so opening another project remounts
 * this rather than resetting the list from a prop.
 */

export interface ProjectHistoryProps {
  /** The saved project whose versions are listed. */
  fileId: string;
  /** Any change refetches the list - bumped by the parent after a save. */
  refreshToken: number;
  disabled: boolean;
  /** Asks the parent to confirm, then restore, this revision. */
  onRestore: (revision: number) => void;
}

export function ProjectHistory({ fileId, refreshToken, disabled, onRestore }: ProjectHistoryProps) {
  const [versions, setVersions] = useState<CraftFileVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let stale = false;
    listCraftFileVersions(fileId)
      .then((result) => {
        if (stale) return;
        setError(null);
        setVersions(result);
      })
      .catch((cause: unknown) => {
        if (!stale) {
          setError(cause instanceof Error ? cause.message : 'Could not load the project history.');
        }
      });
    return () => {
      stale = true;
    };
  }, [fileId, refreshToken, reloadToken]);

  if (error !== null) {
    return <ErrorCard message={error} onRetry={() => setReloadToken((current) => current + 1)} />;
  }

  if (versions === null) return <ListSkeleton count={2} lines={1} />;

  if (versions.length === 0) {
    return <EmptyState message="No saved versions yet. Every save adds one here." />;
  }

  return (
    <ol className="flex max-h-64 flex-col gap-2 overflow-y-auto">
      {versions.map((version) => (
        <li key={version.id}>
          <div className="flex items-center gap-2 rounded-[var(--radius-cut)] border border-crease p-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge size="sm">Revision {version.revision}</Badge>
                <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">
                  {version.name}
                </span>
              </div>
              <span className="font-mono text-xs text-ink-muted">
                {formatDate(version.createdAt)}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onRestore(version.revision)}
              aria-label={`Restore revision ${version.revision}`}
            >
              Restore
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}

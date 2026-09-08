'use client';

import type { CraftFile, CraftStatus, Tutorial } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';

/** Name, tutorial attachment, which project is open, status, and save / delete. */

export const NEW_FILE = 'new';
export const NO_TUTORIAL = 'none';

export interface FileControlsProps {
  files: CraftFile[] | null;
  tutorials: Tutorial[];
  fileId: string | null;
  name: string;
  tutorialId: number | null;
  status: CraftStatus;
  /** Why this project cannot be deployed yet, or null when it can. */
  deployBlockedReason: string | null;
  dirty: boolean;
  saving: boolean;
  fieldErrors: Record<string, string>;
  onNameChange: (name: string) => void;
  onTutorialChange: (tutorialId: number | null) => void;
  onOpenFile: (value: string) => void;
  onSave: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export function FileControls({
  files,
  tutorials,
  fileId,
  name,
  tutorialId,
  status,
  deployBlockedReason,
  dirty,
  saving,
  fieldErrors,
  onNameChange,
  onTutorialChange,
  onOpenFile,
  onSave,
  onToggleStatus,
  onDelete,
}: FileControlsProps) {
  const fileOptions = [
    { value: NEW_FILE, label: 'New project' },
    ...(files ?? []).map((file) => ({ value: file.id, label: file.name })),
  ];

  const deployed = status === 'deployed';
  const blocked = !deployed && deployBlockedReason !== null;

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Open"
        value={fileId ?? NEW_FILE}
        options={fileOptions}
        disabled={files === null}
        hint={files === null ? 'Loading saved projects...' : undefined}
        onChange={(event) => onOpenFile(event.target.value)}
      />

      <Input
        label="Name"
        value={name}
        error={fieldErrors.name}
        onChange={(event) => onNameChange(event.target.value)}
        required
      />

      <Select
        label="Tutorial"
        value={tutorialId === null ? NO_TUTORIAL : String(tutorialId)}
        error={fieldErrors.tutorialId}
        options={[
          { value: NO_TUTORIAL, label: 'Not attached' },
          ...tutorials.map((tutorial) => ({ value: String(tutorial.id), label: tutorial.title })),
        ]}
        onChange={(event) =>
          onTutorialChange(event.target.value === NO_TUTORIAL ? null : Number(event.target.value))
        }
      />

      {fileId === null ? (
        <p className="font-body text-sm text-ink-muted">
          Not saved yet. Save it once and it becomes a draft project you can deploy later.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">Status</span>
            <Badge tone={deployed ? 'accent' : 'neutral'}>{deployed ? 'Deployed' : 'Draft'}</Badge>
          </div>
          <div>
            <Button
              size="sm"
              variant={deployed ? 'secondary' : 'primary'}
              onClick={onToggleStatus}
              disabled={saving || blocked}
            >
              {deployed ? 'Return to draft' : 'Deploy'}
            </Button>
          </div>
          {blocked ? (
            <p className="font-body text-sm text-ink-muted">{deployBlockedReason}</p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onSave} isLoading={saving} disabled={!dirty && fileId !== null}>
          {fileId === null ? 'Save project' : 'Save changes'}
        </Button>
        {fileId === null ? null : (
          <Button variant="danger" size="sm" onClick={onDelete} disabled={saving}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

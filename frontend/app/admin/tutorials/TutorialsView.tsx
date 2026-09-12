'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';
import { Switch } from '@/app/components/ui/Switch';
import { Textarea } from '@/app/components/ui/Textarea';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { useToast } from '@/app/contexts/ToastContext';
import {
  ApiClientError,
  createTutorial,
  deleteTutorial,
  listAdminTutorials,
  updateTutorial,
} from '@/app/lib/api-client';
import { revalidateCatalog } from '@/app/lib/revalidate';
import type {
  CreateTutorialRequest,
  Difficulty,
  Tutorial,
  UpdateTutorialRequest,
} from '@foldify/shared';

const DIFFICULTIES: Array<Difficulty> = ['beginner', 'intermediate', 'advanced'];

interface TutorialFormState {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  estimatedMinutes: string;
  coverImageUrl: string;
  isPublished: boolean;
}

const EMPTY_FORM: TutorialFormState = {
  slug: '',
  title: '',
  summary: '',
  difficulty: 'beginner',
  estimatedMinutes: '',
  coverImageUrl: '',
  isPublished: false,
};

type FormErrors = Partial<Record<keyof TutorialFormState, string>>;

function formToCreate(state: TutorialFormState): CreateTutorialRequest {
  return {
    slug: state.slug.trim(),
    title: state.title.trim(),
    summary: state.summary.trim(),
    difficulty: state.difficulty,
    estimatedMinutes: Number(state.estimatedMinutes) || 0,
    coverImageUrl: state.coverImageUrl.trim() === '' ? null : state.coverImageUrl.trim(),
  };
}

function formToUpdate(state: TutorialFormState): UpdateTutorialRequest {
  return {
    slug: state.slug.trim(),
    title: state.title.trim(),
    summary: state.summary.trim(),
    difficulty: state.difficulty,
    estimatedMinutes: Number(state.estimatedMinutes) || 0,
    coverImageUrl: state.coverImageUrl.trim() === '' ? null : state.coverImageUrl.trim(),
    isPublished: state.isPublished,
  };
}

function tutorialToForm(tutorial: Tutorial): TutorialFormState {
  return {
    slug: tutorial.slug,
    title: tutorial.title,
    summary: tutorial.summary,
    difficulty: tutorial.difficulty,
    estimatedMinutes: String(tutorial.estimatedMinutes),
    coverImageUrl: tutorial.coverImageUrl ?? '',
    isPublished: tutorial.isPublished,
  };
}

function TutorialForm({
  initial,
  isNew,
  onSubmit,
  onCancel,
}: {
  initial: TutorialFormState;
  isNew: boolean;
  onSubmit: (state: TutorialFormState) => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState<TutorialFormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof TutorialFormState) => (value: string | boolean) => {
    setState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(state);
    } catch (cause) {
      if (cause instanceof ApiClientError) {
        const raw = cause.fields ?? {};
        const fields: FormErrors = raw as FormErrors;
        if (Object.keys(fields).length === 0) fields.title = cause.message;
        setErrors(fields);
      } else if (cause instanceof Error) {
        setErrors({ title: cause.message });
      } else {
        setErrors({ title: 'Something went wrong.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Slug"
        value={state.slug}
        onChange={(event) => setField('slug')(event.target.value)}
        error={errors.slug}
        hint="Lowercase letters, numbers and dashes — used in the public URL."
        required
      />
      <Input
        label="Title"
        value={state.title}
        onChange={(event) => setField('title')(event.target.value)}
        error={errors.title}
        required
      />
      <Textarea
        label="Summary"
        value={state.summary}
        onChange={(event) => setField('summary')(event.target.value)}
        error={errors.summary}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Difficulty"
          value={state.difficulty}
          onChange={(event) => setField('difficulty')(event.target.value)}
          options={DIFFICULTIES.map((difficulty) => ({
            value: difficulty,
            label: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
          }))}
          error={errors.difficulty}
          required
        />
        <Input
          label="Estimated minutes"
          type="number"
          min="1"
          step="1"
          value={state.estimatedMinutes}
          onChange={(event) => setField('estimatedMinutes')(event.target.value)}
          error={errors.estimatedMinutes}
          hint="How long the fold takes."
          required
        />
      </div>
      <Input
        label="Cover image URL"
        value={state.coverImageUrl}
        onChange={(event) => setField('coverImageUrl')(event.target.value)}
        error={errors.coverImageUrl}
        hint="Optional — leave blank for the fold mark."
      />
      {!isNew ? (
        <Switch
          label="Published — visible in the catalogue"
          checked={state.isPublished}
          onCheckedChange={setField('isPublished')}
        />
      ) : (
        <p className="font-body text-sm text-ink-muted">
          New tutorials start unpublished until you flip them on.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-crease pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} isLoading={submitting}>
          {isNew ? 'Create tutorial' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

export function TutorialsView() {
  const toast = useToast();
  const [tutorials, setTutorials] = useState<Tutorial[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<'new' | Tutorial | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const confirmTimer = useRef<number | null>(null);

  const applyData = useCallback((data: Tutorial[]) => {
    setError(null);
    setTutorials(data);
  }, []);

  const applyError = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Could not load the tutorials.');
  }, []);

  useEffect(() => {
    let isStale = false;
    listAdminTutorials()
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

  const reload = useCallback(async () => {
    const data = await listAdminTutorials();
    applyData(data);
  }, [applyData]);

  const refreshAfterMutation = async () => {
    try {
      await reload();
    } catch {
      // The mutation itself succeeded; a stale list is recoverable later.
    }
  };

  const handleSaveNew = async (state: TutorialFormState) => {
    await createTutorial(formToCreate(state));
    await revalidateCatalog();
    toast.success('Tutorial created.');
    setEditing(null);
    await refreshAfterMutation();
  };

  const handleSaveEdit = async (state: TutorialFormState) => {
    if (editing === null || editing === 'new') return;
    await updateTutorial(editing.id, formToUpdate(state));
    await revalidateCatalog();
    toast.success('Tutorial saved.');
    setEditing(null);
    await refreshAfterMutation();
  };

  const handleDelete = async (tutorial: Tutorial) => {
    if (confirmingId === tutorial.id) {
      confirmTimer.current = null;
      setConfirmingId(null);
      try {
        await deleteTutorial(tutorial.id);
        await revalidateCatalog();
        toast.success(`"${tutorial.title}" unpublished.`);
        await refreshAfterMutation();
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : 'Could not delete the tutorial.');
      }
    } else {
      setConfirmingId(tutorial.id);
      if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirmingId(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        eyebrow="Admin"
        title="Tutorials"
        description="Create, edit and unpublish the walkthroughs."
        actions={
          <Button onClick={() => setEditing('new')} size="sm">
            New tutorial
          </Button>
        }
      />

      {error !== null ? (
        <ErrorCard message={error} onRetry={() => void reload()} />
      ) : tutorials === null ? (
        <ListSkeleton count={5} lines={2} />
      ) : tutorials.length === 0 ? (
        <EmptyState message="No tutorials yet. Add your first with “New tutorial”." />
      ) : (
        <div className="flex flex-col gap-3">
          {tutorials.map((tutorial) => (
            <Card key={tutorial.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-ink">{tutorial.title}</span>
                    {tutorial.isPublished ? (
                      <Badge tone="accent" size="sm">
                        Live
                      </Badge>
                    ) : (
                      <Badge tone="neutral" size="sm">
                        Hidden
                      </Badge>
                    )}
                    <Badge tone="cardboard" size="sm">
                      {tutorial.difficulty}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm text-ink-muted">
                    /{tutorial.slug} · {tutorial.estimatedMinutes} min
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-2">
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(tutorial)}>
                      Edit
                    </Button>
                    <Button
                      variant={confirmingId === tutorial.id ? 'danger' : 'ghost'}
                      size="sm"
                      onClick={() => void handleDelete(tutorial)}
                    >
                      {confirmingId === tutorial.id ? 'Confirm?' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New tutorial' : editing !== null ? `Edit ${editing.title}` : ''}
        size="lg"
      >
        {editing === 'new' || editing === null ? (
          <TutorialForm
            key="new"
            initial={EMPTY_FORM}
            isNew
            onSubmit={handleSaveNew}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <TutorialForm
            key={editing.id}
            initial={tutorialToForm(editing)}
            isNew={false}
            onSubmit={handleSaveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
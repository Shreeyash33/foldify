'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CraftFile,
  CraftFileData,
  CraftFoldSide,
  CraftFoldStep,
  CraftPoint,
  CraftSheet,
  CraftLayerScope,
  CraftStatus,
  CraftStepKind,
  FoldType,
  Tutorial,
} from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { useToast } from '@/app/contexts/ToastContext';
import {
  ApiClientError,
  createCraftFile,
  deleteCraftFile,
  getCraftFile,
  listAdminTutorials,
  listCraftFiles,
  restoreCraftFileVersion,
  updateCraftFile,
} from '@/app/lib/api-client';
import { cornerVertices, craftId, emptyCraftData, foldFromGesture } from '@/app/lib/craft/craft-file';
import { contentBounds, replay } from '@/app/lib/craft/fold-model';
import { distance } from '@/app/lib/craft/geometry';
import { CraftCanvas, isCornerVertex, type CraftTool } from './CraftCanvas';
import { FileControls, NEW_FILE } from './FileControls';
import { ProjectHistory } from './ProjectHistory';
import { SheetControls } from './SheetControls';
import { FoldDraftPanel } from './FoldDraftPanel';
import { VertexPanel } from './VertexPanel';
import type { FoldDraft } from './fold-draft';
import { StepList } from './StepList';
import {
  destinationTargets,
  formatPoint,
  projectOnOutline,
  resolveDestination,
  resolveOrigin,
  snapTargets,
  stageBounds,
  stageFrame,
} from './editor-geometry';

/**
 * The Craft Maker: pick two points on the paper to record a fold, replay the
 * sequence, and save it as a CraftFile against a tutorial.
 *
 * One CraftFileData object drives everything and is never mutated in place.
 * A new identity makes FoldStage snap; a change of previewIndex by one with the
 * same identity is what makes it animate. That split is the whole interaction
 * model: editing is instant, playback is animated.
 */

const UNTITLED = 'Untitled fold';

/**
 * Flipping which half moves is not a cosmetic toggle: the crease stays put, but
 * the fold now carries `target` onto `origin` instead of the other way round,
 * and the model lands on the opposite side of the crease. Swapping the recorded
 * gesture with the side keeps the two from ever disagreeing - otherwise the step
 * still reads "folds A onto B" while doing the reverse.
 */
function applyStepPatch(step: CraftFoldStep, patch: Partial<CraftFoldStep>): CraftFoldStep {
  const next = { ...step, ...patch };
  const flipped = patch.side !== undefined && patch.side !== step.side;

  if (!flipped || step.origin === undefined || step.target === undefined) return next;
  return { ...next, origin: step.target, target: step.origin };
}

function snapshotOf(name: string, tutorialId: number | null, data: CraftFileData): string {
  return JSON.stringify({ name, tutorialId, data });
}

type Confirm =
  | { kind: 'open'; target: string }
  | { kind: 'delete' }
  | { kind: 'restore'; revision: number };

export function CraftMakerView() {
  const toast = useToast();

  const [initial] = useState(() => emptyCraftData());
  const [data, setData] = useState<CraftFileData>(initial);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [tool, setTool] = useState<CraftTool>('fold');
  const [draft, setDraft] = useState<FoldDraft | null>(null);
  const [draftType, setDraftType] = useState<FoldType>('valley');
  const [draftKind, setDraftKind] = useState<CraftStepKind>('fold');
  const [draftScope, setDraftScope] = useState<CraftLayerScope>('all');
  const [draftSide, setDraftSide] = useState<CraftFoldSide | null>(null);
  const [selectedVertexId, setSelectedVertexId] = useState<string | null>(null);
  const [hover, setHover] = useState<CraftPoint | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const [fileId, setFileId] = useState<string | null>(null);
  const [name, setName] = useState(UNTITLED);
  const [tutorialId, setTutorialId] = useState<number | null>(null);
  const [status, setStatus] = useState<CraftStatus>('draft');
  const [saved, setSaved] = useState(() => snapshotOf(UNTITLED, null, initial));
  /* Bumped whenever the server-side version list changes, so ProjectHistory
     refetches without the parent holding the list itself. */
  const [historyToken, setHistoryToken] = useState(0);

  const [files, setFiles] = useState<CraftFile[] | null>(null);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const dirty = snapshotOf(name, tutorialId, data) !== saved;

  const playingRef = useRef(false);
  const previewRef = useRef(0);
  const stepCountRef = useRef(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    previewRef.current = previewIndex;
  }, [previewIndex]);
  useEffect(() => {
    stepCountRef.current = data.steps.length;
  }, [data.steps.length]);

  const reloadFiles = useCallback(async () => {
    setFiles(await listCraftFiles());
  }, []);

  useEffect(() => {
    let stale = false;
    Promise.all([listCraftFiles(), listAdminTutorials()])
      .then(([craftFiles, adminTutorials]) => {
        if (stale) return;
        setLoadError(null);
        setFiles(craftFiles);
        setTutorials(adminTutorials);
      })
      .catch((cause: unknown) => {
        if (!stale) {
          setLoadError(cause instanceof Error ? cause.message : 'Could not load saved projects.');
        }
      });
    return () => {
      stale = true;
    };
  }, []);

  /* Playback ------------------------------------------------------------- */

  /**
   * Stable for the life of the view: FoldStage restarts its tween whenever this
   * callback changes identity, so the run is read through refs rather than
   * closed over.
   */
  const handleFoldComplete = useCallback(() => {
    if (!playingRef.current) return;
    if (previewRef.current >= stepCountRef.current) {
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    setPreviewIndex(previewRef.current + 1);
  }, []);

  /* Kicks off a run. Every later fold is triggered by handleFoldComplete, so
     the sequence is paced by the animation rather than by a timer.

     The first fold is requested a frame late on purpose: FoldStage only tweens
     a step change of exactly one, so the flat sheet has to reach the DOM before
     fold 1 is asked for, or the run opens with a snap instead of a fold. */
  useEffect(() => {
    if (!playing) return;

    const frame = requestAnimationFrame(() => {
      if (data.steps.length === 0) {
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      if (previewIndex === 0) setPreviewIndex(1);
    });

    return () => cancelAnimationFrame(frame);
  }, [playing, previewIndex, data.steps.length]);

  const stopPlaying = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
  }, []);

  useEffect(() => stopPlaying, [stopPlaying]);

  const handlePlay = () => {
    if (playing) {
      stopPlaying();
      return;
    }
    if (data.steps.length === 0) {
      toast.info('Record a fold first.');
      return;
    }
    setDraft(null);
    setDraftSide(null);
    setHover(null);
    setPreviewIndex(0);
    setPlaying(true);
  };

  const stepPreview = (delta: -1 | 1) => {
    stopPlaying();
    setPreviewIndex((current) => Math.max(0, Math.min(current + delta, data.steps.length)));
  };

  /* Canvas --------------------------------------------------------------- */

  const handlePick = useCallback(
    (raw: CraftPoint) => {
      if (playingRef.current) return;

      const state = replay(data, previewIndex);
      const { scale } = stageFrame(data);

      if (tool === 'vertex') {
        const placed = projectOnOutline(raw, state);
        if (placed === null) {
          toast.error('No edge close enough to place a point on.');
          return;
        }
        setData((current) => ({
          ...current,
          vertices: [...current.vertices, { id: craftId('vertex'), x: placed.x, y: placed.y }],
        }));
        toast.success(`Snap point added at ${formatPoint(placed)}.`);
        return;
      }

      /* Two clicks, and neither of them draws the crease. The first says which
         point of the paper moves, the second says where it lands; the crease is
         the perpendicular bisector of the pair and the moving half is the one
         the first point sits in. Both follow from the picks, so nothing here
         has to be assumed and then corrected. */
      if (draft === null) {
        const origin = resolveOrigin(raw, state, snapTargets(state, data.vertices, scale), scale);
        if (origin === null) {
          toast.error('Click a point on the paper to fold from.');
          return;
        }
        setDraft({ origin, target: null });
        return;
      }

      const destination = resolveDestination(
        raw,
        destinationTargets(state, data.vertices, data.sheet, scale),
        scale,
      );

      /* Only a true double-click on the origin is not a fold: the engine
         returns null only when the two picks coincide (foldFromGesture). The
         old SNAP_RADIUS*scale*0.5 threshold ate every destination within a few
         millimetres of the origin, which is exactly where a fold STARTING at a
         vertex lands when the author picks a nearby vertex as the destination —
         the click was silently swallowed and the gesture ran one pick behind. */
      if (distance(draft.origin, destination) < 0.001) {
        toast.error('Pick a destination away from the point you are folding.');
        return;
      }

      // Re-clicking before Record just moves the destination.
      setDraft({ origin: draft.origin, target: destination });
      setDraftSide(null);
    },
    [data, previewIndex, tool, draft, toast],
  );

  const layerCount = useMemo(() => replay(data, previewIndex).layers.length, [data, previewIndex]);

  /** The crease and moving half implied by the draft, recomputed as it changes. */
  const draftFold = useMemo(() => {
    if (draft === null || draft.target === null) return null;
    const state = replay(data, previewIndex);
    const bounds = stageBounds(state) ?? contentBounds(data);
    return foldFromGesture(draft.origin, draft.target, bounds, draftType, draftKind, draftScope);
  }, [draft, data, previewIndex, draftType, draftKind, draftScope]);

  const recordFold = () => {
    if (draftFold === null) {
      toast.error('That is not a fold - the two points are the same.');
      return;
    }

    const step =
      draftSide === null || draftSide === draftFold.side
        ? draftFold
        : applyStepPatch(draftFold, { side: draftSide });
    /* Inserted at the preview position, not appended. The points were picked
       against the paper as it stands after `previewIndex` folds, so that is the
       only place in the sequence where this crease means what the author drew. */
    const at = previewIndex;

    setDraft(null);
    setDraftSide(null);
    setHover(null);
    setData((current) => ({
      ...current,
      steps: [...current.steps.slice(0, at), step, ...current.steps.slice(at)],
    }));
    setSelectedId(step.id);
    setPreviewIndex(at + 1);
    toast.success(`Fold ${at + 1} recorded.`);
  };

  const selectedVertex = data.vertices.find((vertex) => vertex.id === selectedVertexId) ?? null;

  const moveVertex = (id: string, point: CraftPoint) => {
    setData((current) => ({
      ...current,
      vertices: current.vertices.map((vertex) =>
        vertex.id === id ? { ...vertex, x: point.x, y: point.y } : vertex,
      ),
    }));
  };

  const deleteVertex = (id: string) => {
    setSelectedVertexId(null);
    setData((current) => ({
      ...current,
      vertices: current.vertices.filter((vertex) => vertex.id !== id),
    }));
    toast.success('Point removed.');
  };

  const cancelDraft = () => {
    setDraft(null);
    setDraftSide(null);
    setHover(null);
  };

  const selectTool = (next: CraftTool) => {
    stopPlaying();
    setTool(next);
    setDraft(null);
    setDraftSide(null);
    setDraftScope('all');
    setSelectedVertexId(null);
    setHover(null);
  };

  /* Steps ---------------------------------------------------------------- */

  const selectStep = (index: number) => {
    stopPlaying();
    const step = data.steps[index];
    if (step === undefined) return;
    setSelectedId(step.id);
    setPreviewIndex(index + 1);
  };

  const moveStep = (index: number, delta: -1 | 1) => {
    stopPlaying();
    const target = index + delta;
    if (target < 0 || target >= data.steps.length) return;
    const steps = [...data.steps];
    const from = steps[index];
    const to = steps[target];
    if (from === undefined || to === undefined) return;
    steps[index] = to;
    steps[target] = from;
    setData((current) => ({ ...current, steps }));
    setPreviewIndex((current) => Math.max(0, Math.min(current, steps.length)));
  };

  const deleteStep = (index: number) => {
    stopPlaying();
    const step = data.steps[index];
    if (step === undefined) return;
    const steps = data.steps.filter((_, position) => position !== index);
    setData((current) => ({ ...current, steps }));
    if (selectedId === step.id) setSelectedId(null);
    setPreviewIndex((current) => Math.max(0, Math.min(current, steps.length)));
  };

  const updateStep = useCallback((id: string, patch: Partial<CraftFoldStep>) => {
    setData((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === id ? applyStepPatch(step, patch) : step)),
    }));
  }, []);

  const changeSheet = (sheet: CraftSheet) => {
    stopPlaying();
    setDraft(null);
    setDraftSide(null);
    setData((current) => ({
      ...current,
      sheet,
      vertices: [
        ...cornerVertices(sheet),
        ...current.vertices.filter((vertex) => !isCornerVertex(vertex.id)),
      ],
    }));
    if (data.steps.length > 0) {
      toast.info('Sheet resized. Existing folds keep the coordinates they were drawn at.');
    }
  };

  /* Project --------------------------------------------------------------- */

  const resetTo = (file: CraftFile | null) => {
    stopPlaying();
    const next = file === null ? emptyCraftData() : file.data;
    const nextName = file === null ? UNTITLED : file.name;
    const nextTutorial = file === null ? null : file.tutorialId;
    setData(next);
    setName(nextName);
    setTutorialId(nextTutorial);
    setStatus(file === null ? 'draft' : file.status);
    setFileId(file === null ? null : file.id);
    setSaved(snapshotOf(nextName, nextTutorial, next));
    setPreviewIndex(0);
    setSelectedId(null);
    setDraft(null);
    setDraftSide(null);
    setHover(null);
    setSaveError(null);
    setFieldErrors({});
  };

  const openFile = async (value: string) => {
    if (value === NEW_FILE) {
      resetTo(null);
      return;
    }
    setBusy(true);
    try {
      resetTo(await getCraftFile(value));
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not open that project.');
    } finally {
      setBusy(false);
    }
  };

  const requestOpen = (value: string) => {
    if (value === (fileId ?? NEW_FILE)) return;
    if (dirty) {
      setConfirm({ kind: 'open', target: value });
      return;
    }
    void openFile(value);
  };

  /** A deployed project is what a reader actually plays, so it has to be attached
      and non-empty; the button stays disabled until both hold. */
  const deployBlockedReason =
    tutorialId === null && data.steps.length === 0
      ? 'Attach a tutorial and record at least one fold before deploying.'
      : tutorialId === null
        ? 'Attach this project to a tutorial before deploying.'
        : data.steps.length === 0
          ? 'Record at least one fold before deploying.'
          : null;

  const handleSave = async (nextStatus: CraftStatus = status) => {
    setBusy(true);
    setSaveError(null);
    setFieldErrors({});
    const trimmed = name.trim() === '' ? UNTITLED : name.trim();

    try {
      const input = { name: trimmed, tutorialId, data, status: nextStatus };
      const result =
        fileId === null ? await createCraftFile(input) : await updateCraftFile(fileId, input);
      setFileId(result.id);
      setName(trimmed);
      setStatus(result.status);
      // Snapshot what is on screen rather than the response, so a server that
      // normalises the payload cannot leave the view permanently dirty.
      setSaved(snapshotOf(trimmed, tutorialId, data));
      toast.success(
        nextStatus === status
          ? 'Project saved.'
          : nextStatus === 'deployed'
            ? 'Project deployed.'
            : 'Project returned to draft.',
      );
      setHistoryToken((current) => current + 1);
      await reloadFiles();
    } catch (cause) {
      if (cause instanceof ApiClientError) {
        setFieldErrors(cause.fields ?? {});
        setSaveError(cause.message);
      } else {
        setSaveError(cause instanceof Error ? cause.message : 'Could not save the project.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = () => {
    if (status === 'deployed') {
      void handleSave('draft');
      return;
    }
    if (deployBlockedReason !== null) return;
    void handleSave('deployed');
  };

  const handleRestore = async (revision: number) => {
    if (fileId === null) return;
    setConfirm(null);
    setBusy(true);
    try {
      // Same path as opening a file: the restored CraftFile replaces the editor.
      resetTo(await restoreCraftFileVersion(fileId, revision));
      setHistoryToken((current) => current + 1);
      toast.success(`Revision ${revision} restored.`);
      await reloadFiles();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not restore that revision.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (fileId === null) return;
    setConfirm(null);
    setBusy(true);
    try {
      await deleteCraftFile(fileId);
      toast.success('Project deleted.');
      resetTo(null);
      await reloadFiles();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not delete the project.');
    } finally {
      setBusy(false);
    }
  };

  /* Render --------------------------------------------------------------- */

  const hint = useMemo(() => {
    if (tool === 'vertex') return 'Click any edge of the paper to add a snap point there.';
    if (draft === null) return 'Click the point on the paper you want to fold.';
    if (draft.target === null) return 'Now click where that point should land.';
    return 'Choose the fold type and which half moves, then record it.';
  }, [tool, draft]);

  const confirmCopy =
    confirm === null
      ? null
      : confirm.kind === 'delete'
        ? {
            title: 'Delete this project?',
            body: 'This removes the saved project for good. Any tutorial it is attached to loses its animation.',
            action: 'Delete',
          }
        : confirm.kind === 'restore'
          ? {
              title: `Restore revision ${confirm.revision}?`,
              body: 'The editor is replaced by that saved version. Any change you have not saved is lost.',
              action: 'Restore',
            }
          : {
              title: 'Discard changes?',
              body: 'This project has changes that were never saved. Opening another one loses them.',
              action: 'Discard',
            };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        eyebrow="Admin"
        title="Craft Maker"
        description="Record a fold sequence by clicking the paper, then replay it the way a reader will see it."
        actions={
          dirty ? (
            <Badge tone="danger">Unsaved changes</Badge>
          ) : (
            <Badge tone="neutral">{fileId === null ? 'New project' : 'Project saved'}</Badge>
          )
        }
      />

      {loadError !== null ? (
        <ErrorCard message={loadError} onRetry={() => void reloadFiles()} />
      ) : null}
      {saveError !== null ? <ErrorCard message={saveError} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Canvas</CardTitle>
              <Badge tone={playing ? 'accent' : 'neutral'}>
                Fold {previewIndex} of {data.steps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="aspect-square w-full overflow-hidden rounded-[var(--radius-cut)] border border-crease bg-paper-sunken">
              <CraftCanvas
                data={data}
                previewIndex={previewIndex}
                tool={tool}
                draft={draft}
                draftFold={draftFold}
                draftSide={draftSide}
                selectedVertexId={selectedVertexId}
                onSelectVertex={setSelectedVertexId}
                hover={hover}
                playing={playing}
                onPickPoint={handlePick}
                onHover={setHover}
                onFoldComplete={handleFoldComplete}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">Tool</span>
              <Button
                size="sm"
                variant={tool === 'fold' ? 'primary' : 'secondary'}
                onClick={() => selectTool('fold')}
              >
                Fold
              </Button>
              <Button
                size="sm"
                variant={tool === 'vertex' ? 'primary' : 'secondary'}
                onClick={() => selectTool('vertex')}
              >
                Add vertex
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => stepPreview(-1)}
                disabled={previewIndex === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => stepPreview(1)}
                disabled={previewIndex >= data.steps.length}
              >
                Next
              </Button>
              <Button size="sm" variant={playing ? 'danger' : 'primary'} onClick={handlePlay}>
                {playing ? 'Stop' : 'Play'}
              </Button>
            </div>

            <p className="font-body text-sm text-ink-muted">{hint}</p>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card material="cardboard">
            <CardHeader>
              <CardTitle>Steps</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {selectedVertex === null ? null : (
                <VertexPanel
                  key={selectedVertex.id}
                  vertex={selectedVertex}
                  isCorner={isCornerVertex(selectedVertex.id)}
                  onMove={moveVertex}
                  onDelete={deleteVertex}
                  onClose={() => setSelectedVertexId(null)}
                />
              )}

              {draft === null ? null : (
                <FoldDraftPanel
                  draft={draft}
                  foldType={draftType}
                  kind={draftKind}
                  onKind={setDraftKind}
                  layerScope={draftScope}
                  onLayerScope={setDraftScope}
                  layerCount={layerCount}
                  side={draftSide ?? draftFold?.side ?? 'left'}
                  originSide={draftFold?.side ?? 'left'}
                  onFoldType={setDraftType}
                  onSide={setDraftSide}
                  onRecord={recordFold}
                  onCancel={cancelDraft}
                />
              )}

              <StepList
                steps={data.steps}
                selectedId={selectedId}
                previewIndex={previewIndex}
                disabled={playing}
                onSelect={selectStep}
                onMove={moveStep}
                onDelete={deleteStep}
                onUpdate={updateStep}
              />
            </CardBody>
          </Card>

          <Card material="cardboard">
            <CardHeader>
              <CardTitle>Sheet</CardTitle>
            </CardHeader>
            <CardBody>
              <SheetControls
                key={`${data.sheet.width}x${data.sheet.height}`}
                sheet={data.sheet}
                onChange={changeSheet}
                disabled={playing}
              />
            </CardBody>
          </Card>

          <Card material="cardboard">
            <CardHeader>
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <FileControls
                files={files}
                tutorials={tutorials}
                fileId={fileId}
                name={name}
                tutorialId={tutorialId}
                status={status}
                deployBlockedReason={deployBlockedReason}
                dirty={dirty}
                saving={busy}
                fieldErrors={fieldErrors}
                onNameChange={setName}
                onTutorialChange={setTutorialId}
                onOpenFile={requestOpen}
                onSave={() => void handleSave()}
                onToggleStatus={handleToggleStatus}
                onDelete={() => setConfirm({ kind: 'delete' })}
              />

              {fileId === null ? null : (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-xs tracking-wider text-ink-muted uppercase">
                    History
                  </span>
                  <ProjectHistory
                    key={fileId}
                    fileId={fileId}
                    refreshToken={historyToken}
                    disabled={busy}
                    onRestore={(revision) => setConfirm({ kind: 'restore', revision })}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirmCopy?.title ?? ''}
        size="sm"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm === null) return;
                if (confirm.kind === 'delete') {
                  void handleDelete();
                  return;
                }
                if (confirm.kind === 'restore') {
                  void handleRestore(confirm.revision);
                  return;
                }
                const target = confirm.target;
                setConfirm(null);
                void openFile(target);
              }}
            >
              {confirmCopy?.action ?? 'Confirm'}
            </Button>
          </div>
        }
      >
        <p className="font-body text-base text-ink">{confirmCopy?.body ?? ''}</p>
      </Modal>
    </div>
  );
}

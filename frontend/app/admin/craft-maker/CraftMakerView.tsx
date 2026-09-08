'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CraftAxis,
  CraftFile,
  CraftFileData,
  CraftFoldSide,
  CraftFoldStep,
  CraftPoint,
  CraftRotation,
  CraftSheet,
  CraftLayerScope,
  CraftStatus,
  CraftStepKind,
  CraftVertex,
  FoldType,
  Tutorial,
} from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';
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
import { contentBounds, firstDeadFrame, foldQuality, replay } from '@/app/lib/craft/fold-model';
import { distance, pointInConvexPolygon } from '@/app/lib/craft/geometry';
import { CraftCanvas, isCornerVertex, type CraftTool } from './CraftCanvas';
import { FileControls, NEW_FILE } from './FileControls';
import { ProjectHistory } from './ProjectHistory';
import { SheetControls } from './SheetControls';
import { FoldDraftPanel } from './FoldDraftPanel';
import { VertexPanel } from './VertexPanel';
import type { FoldDraft } from './fold-draft';
import { StepList } from './StepList';
import {
  SNAP_RADIUS,
  destinationTargets,
  formatPoint,
  nearestTarget,
  projectOnOutline,
  resolveDestination,
  scopeForOrigin,
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

/** The nearest vertex within `tolerance` of `point`, or null. */
const vertexAt = (
  point: CraftPoint,
  vertices: { id: string; x: number; y: number }[],
  tolerance: number,
) =>
  vertices.reduce<{ id: string; x: number; y: number } | null>((best, vertex) => {
    const gap = distance(point, vertex);
    return best === null || gap < distance(point, best) ? (gap <= tolerance ? vertex : best) : best;
  }, null);

/** Adds an author vertex at `point` unless one already sits within snap radius. */
function appendVertexIfMissing(vertices: CraftVertex[], point: CraftPoint): CraftVertex[] {
  if (vertices.some((vertex) => distance(vertex, point) <= SNAP_RADIUS)) return vertices;
  return [...vertices, { id: craftId('vertex'), x: point.x, y: point.y }];
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
  const [draftScope, setDraftScope] = useState<CraftLayerScope>(1);
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

  const history = useRef<{ past: CraftFileData[]; future: CraftFileData[] }>({ past: [], future: [] });

  /** Records the CURRENT data onto the undo stack; call BEFORE a mutation. */
  const pushHistory = useCallback(() => {
    const { past } = history.current;
    history.current = {
      past: past.length >= 50 ? [...past.slice(1), data] : [...past, data],
      future: [],
    };
  }, [data]);

  const undo = () => {
    const { past, future } = history.current;
    const previous = past[past.length - 1];
    if (previous === undefined) return;
    history.current = { past: past.slice(0, -1), future: [data, ...future] };
    setData(previous);
  };

  const redo = () => {
    const { past, future } = history.current;
    const next = future[0];
    if (next === undefined) return;
    history.current = { past: [...past, data], future: future.slice(1) };
    setData(next);
  };

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
    setPreviewIndex((current) => Math.max(0, Math.min(current + delta, stepCountRef.current)));
  };

  /* Canvas --------------------------------------------------------------- */

  const handlePick = useCallback(
    (raw: CraftPoint) => {
      if (playingRef.current) return;

      const state = replay(data, previewIndex);
      const { scale } = stageFrame(data);

      if (tool === 'vertex') {
        const placed = projectOnOutline(raw, state);
        // Silent: an off-paper click is a deselect, not a failed placement.
        if (placed === null || distance(raw, placed) > SNAP_RADIUS) return;
        pushHistory();
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
        const origin =
          nearestTarget(raw, snapTargets(state, data.vertices, scale), SNAP_RADIUS * scale) ??
          (state.layers.some((layer) => pointInConvexPolygon(raw, layer.polygon)) ? raw : null);
        if (origin === null) {
          toast.error('Click on the paper to fold from.');
          return;
        }
        const originVertex = vertexAt(raw, data.vertices, SNAP_RADIUS * scale);
        setDraft({
          origin,
          originVertexId: originVertex === null ? null : originVertex.id,
          target: null,
          targetVertexId: null,
        });
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

      // Empty-space clicks must not act on the paper: the picked destination
      // has to land on paper or within snap radius of a target (which includes
      // the sheet centre).
      const onPaper = state.layers.some((layer) => pointInConvexPolygon(raw, layer.polygon));
      if (distance(raw, destination) > SNAP_RADIUS * scale && !onPaper) {
        toast.error('The destination must land on the paper.');
        return;
      }

      // Re-clicking before Record just moves the destination.
      const targetVertex = vertexAt(raw, data.vertices, SNAP_RADIUS * scale);
      setDraft({
        origin: draft.origin,
        originVertexId: draft.originVertexId,
        target: destination,
        targetVertexId: targetVertex === null ? null : targetVertex.id,
      });
      const grabbed =
        draft.originVertexId === null
          ? draft.origin
          : (data.vertices.find((v) => v.id === draft.originVertexId) ?? draft.origin);
      setDraftScope(scopeForOrigin(state, grabbed));
      setDraftSide(null);
    },
    [data, previewIndex, tool, draft, toast],
  );

  const handleContextPoint = useCallback(
    (raw: CraftPoint) => {
      if (draft === null || (draft.originVertexId === null && draft.targetVertexId === null)) return;
      const nearOrigin = draft.originVertexId !== null ? distance(raw, draft.origin) : Infinity;
      const nearTarget =
        draft.targetVertexId !== null && draft.target !== null ? distance(raw, draft.target) : Infinity;
      const detachTarget = draft.targetVertexId !== null && nearTarget < nearOrigin;
      setDraft((current) =>
        current === null
          ? current
          : {
              ...current,
              originVertexId: detachTarget ? current.originVertexId : null,
              targetVertexId: detachTarget ? null : current.targetVertexId,
            },
      );
      toast.info('Fold end detached from its vertex.');
    },
    [draft, toast],
  );

  const layerCount = useMemo(() => replay(data, previewIndex).layers.length, [data, previewIndex]);

  /** The crease and moving half implied by the draft, recomputed as it changes. */
  const draftFold = useMemo(() => {
    if (draft === null || draft.target === null) return null;
    const state = replay(data, previewIndex);
    const bounds = stageBounds(state) ?? contentBounds(data);
    return foldFromGesture(draft.origin, draft.target, bounds, draftType, draftKind, draftScope);
  }, [draft, data, previewIndex, draftType, draftKind, draftScope]);

  const draftQuality = useMemo(() => {
    if (draftFold === null) return null;
    return foldQuality(replay(data, previewIndex), draftFold);
  }, [draftFold, data, previewIndex]);

  const draftWarning = useMemo(() => {
    if (draftQuality === null) return null;
    if (!draftQuality.cutsPaper) return 'The crease will not cross the paper here — nothing would fold. Pick the destination so the crease cuts the sheet.';
    if (draftQuality.foldsAll) return 'This fold swings nearly the whole piece over itself — the reader would see one flat colour. Consider a corner or offset edge.';
    if (draftQuality.movingFraction > 0.4 && draftQuality.movingFraction < 0.6) return 'This fold carries about half the shape over itself — the model may read as one flat colour. Consider a corner or offset edge.';
    return null;
  }, [draftQuality]);

  const rotation = data.rotation ?? { axis: 'z' as CraftAxis, degrees: 0 };
  const updateRotation = (patch: Partial<CraftRotation>) => {
    if (playing) return;
    const degrees = Math.max(-180, Math.min(180, Math.round(patch.degrees ?? rotation.degrees)));
    pushHistory();
    setData((current) => ({
      ...current,
      rotation: { axis: patch.axis ?? rotation.axis, degrees },
    }));
  };

  /* Degrees commits on blur, like durations elsewhere: the field holds its own
     text while the user types, and a half-typed number never rotates the model.
     Sanitising here means the stored value is always a whole degree in range. */
  const [degreesDraft, setDegreesDraft] = useState(String(rotation.degrees));
  useEffect(() => {
    setDegreesDraft(String(data.rotation?.degrees ?? 0));
  }, [data.rotation]);
  const commitDegrees = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDegreesDraft(String(rotation.degrees));
      return;
    }
    const next = Math.max(-180, Math.min(180, Math.round(parsed)));
    setDegreesDraft(String(next));
    if (next !== rotation.degrees) updateRotation({ degrees: next });
  };

  const recordFold = () => {
    if (draftFold === null) {
      toast.error('That is not a fold - the two points are the same.');
      return;
    }

    const step =
      draftSide === null || draftSide === draftFold.side
        ? draftFold
        : applyStepPatch(draftFold, { side: draftSide });

    const quality = foldQuality(replay(data, previewIndex), step);
    if (!quality.cutsPaper) {
      toast.error('That crease does not cross the paper here — nothing would fold. Pick the destination on the other side of the shape.');
      return;
    }
    if (quality.foldsAll || (quality.movingFraction > 0.4 && quality.movingFraction < 0.6)) {
      toast.info('Heads up: this fold carries a lot of the paper over itself and may read as one flat colour. A corner or offset edge reads better.');
    }

    /* Inserted at the preview position, not appended. The points were picked
       against the paper as it stands after `previewIndex` folds, so that is the
       only place in the sequence where this crease means what the author drew. */
    const at = previewIndex;

    setDraft(null);
    setDraftSide(null);
    setHover(null);
    pushHistory();
    setData((current) => ({
      ...current,
      steps: [...current.steps.slice(0, at), step, ...current.steps.slice(at)],
      ...(step.kind === 'crease'
        ? { vertices: appendVertexIfMissing(appendVertexIfMissing(current.vertices, step.from), step.to) }
        : {}),
    }));
    setSelectedId(step.id);
    setPreviewIndex(at + 1);
    toast.success(`Fold ${at + 1} recorded.`);
  };

  const selectedVertex = data.vertices.find((vertex) => vertex.id === selectedVertexId) ?? null;

  const mergeCandidates = useMemo(() => {
    if (selectedVertex === null) return [];
    return data.vertices.filter(
      (vertex) =>
        vertex.id !== selectedVertex.id &&
        !isCornerVertex(vertex.id) &&
        distance(vertex, selectedVertex) <= SNAP_RADIUS,
    );
  }, [selectedVertex, data.vertices]);

  const mergeVertices = () => {
    if (selectedVertex === null || mergeCandidates.length === 0) return;
    const keep = new Set([
      selectedVertex.id,
      ...data.vertices
        .filter((v) => isCornerVertex(v.id) || !mergeCandidates.some((m) => m.id === v.id))
        .map((v) => v.id),
    ]);
    pushHistory();
    setData((current) => ({
      ...current,
      vertices: current.vertices.filter((vertex) => keep.has(vertex.id)),
    }));
    toast.success(
      `Merged ${mergeCandidates.length} ${mergeCandidates.length === 1 ? 'point' : 'points'} into the selected one.`,
    );
  };

  const moveVertex = (id: string, point: CraftPoint) => {
    pushHistory();
    setData((current) => ({
      ...current,
      vertices: current.vertices.map((vertex) =>
        vertex.id === id ? { ...vertex, x: point.x, y: point.y } : vertex,
      ),
    }));
  };

  const deleteVertex = (id: string) => {
    setSelectedVertexId(null);
    pushHistory();
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
    setDraftScope(1);
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
    pushHistory();
    setData((current) => {
      const steps = [...current.steps];
      const from = steps[index];
      const to = steps[target];
      if (from === undefined || to === undefined) return current;
      steps[index] = to;
      steps[target] = from;
      return { ...current, steps };
    });
    setPreviewIndex((current) => Math.max(0, Math.min(current, data.steps.length)));
  };

  const deleteStep = (index: number) => {
    stopPlaying();
    const step = data.steps[index];
    if (step === undefined) return;
    pushHistory();
    setData((current) => ({
      ...current,
      steps: current.steps.filter((_, position) => position !== index),
    }));
    if (selectedId === step.id) setSelectedId(null);
    setPreviewIndex((current) => Math.max(0, Math.min(current, data.steps.length)));
  };

  const updateStep = useCallback(
    (id: string, patch: Partial<CraftFoldStep>) => {
      const index = data.steps.findIndex((step) => step.id === id);
      pushHistory();
      setData((current) => ({
        ...current,
        steps: current.steps.map((step) => (step.id === id ? applyStepPatch(step, patch) : step)),
      }));
      if (index >= 0 && previewIndex > index + 1) setPreviewIndex(index + 1);
    },
    [data.steps, previewIndex, pushHistory],
  );

  const changeSheet = (sheet: CraftSheet) => {
    stopPlaying();
    setDraft(null);
    setDraftSide(null);
    pushHistory();
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
    history.current = { past: [], future: [] };
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
  const deployBlockedReason = (() => {
    if (tutorialId === null && data.steps.length === 0) {
      return 'Attach a tutorial and record at least one fold before deploying.';
    }
    if (tutorialId === null) {
      return 'Attach this project to a tutorial before deploying.';
    }
    if (data.steps.length === 0) {
      return 'Record at least one fold before deploying.';
    }
    const dead = firstDeadFrame(data);
    if (dead !== null) {
      return `Fold ${dead.index + 1} does not cross the paper — fix it before deploying.`;
    }
    return null;
  })();

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (playingRef.current) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirm !== null) { setConfirm(null); return; }
        if (draft !== null) { cancelDraft(); return; }
        if (selectedVertexId !== null) { setSelectedVertexId(null); return; }
        if (selectedId !== null) setSelectedId(null);
        return;
      }
      if (event.key === 'ArrowLeft') { event.preventDefault(); stepPreview(-1); return; }
      if (event.key === 'ArrowRight') { event.preventDefault(); stepPreview(1); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && tool === 'vertex' && selectedVertexId !== null) {
        event.preventDefault();
        if (isCornerVertex(selectedVertexId)) toast.error('Sheet corners cannot be removed.');
        else deleteVertex(selectedVertexId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
                rotation={rotation}
                onContextPoint={handleContextPoint}
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
              <Button size="sm" variant="secondary" onClick={undo} disabled={playing || history.current.past.length === 0}>
                Undo
              </Button>
              <Button size="sm" variant="secondary" onClick={redo} disabled={playing || history.current.future.length === 0}>
                Redo
              </Button>
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
                  nearCount={mergeCandidates.length}
                  onMerge={mergeVertices}
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
                  warning={draftWarning}
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

              <div className="flex flex-col gap-2 border-t border-crease pt-4">
                <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">
                  Model rotation
                </p>
                <p className="font-body text-sm text-ink-muted">
                  Turn the whole model on an axis. Z spins it in place; X and Y foreshorten it like
                  a real 3D turn.
                </p>
                <div className="flex items-end gap-2">
                  <Select
                    label="Axis"
                    value={rotation.axis}
                    onChange={(event) => updateRotation({ axis: event.target.value as CraftAxis })}
                    options={[
                      { value: 'x', label: 'X' },
                      { value: 'y', label: 'Y' },
                      { value: 'z', label: 'Z' },
                    ]}
                  />
                  <Input
                    label="Degrees"
                    type="number"
                    min={-180}
                    max={180}
                    step={15}
                    size="sm"
                    value={degreesDraft}
                    onChange={(event) => setDegreesDraft(event.target.value)}
                    onBlur={(event) => commitDegrees(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={playing}
                    onClick={() => updateRotation({ degrees: 0 })}
                    className="mb-0.5"
                  >
                    Reset
                  </Button>
                </div>
              </div>
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

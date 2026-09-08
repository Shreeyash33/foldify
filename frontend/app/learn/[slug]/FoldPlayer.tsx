"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CraftFileData,
  CraftFoldStep,
  FoldType,
  Tutorial,
  TutorialStep,
} from "@foldify/shared";
import { FoldStage } from "@/app/components/craft/FoldStage";
import { Badge, type BadgeTone } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/app/components/ui/Card";
import { PaperSurface } from "@/app/components/ui/PaperSurface";
import { cn, formatDuration } from "@/app/lib/utils";

/**
 * The fold player: a slide-by-slide presentation of one tutorial.
 *
 *   left    a list of every tutorial, for hopping between folds
 *   centre  the fold stage with pagination and playback beneath it
 *   right   canvas size, then the current step
 *
 * The written steps and the CraftFile fold steps are index-aligned but may
 * differ in length, so one zero-based `stepIndex` drives everything and each
 * side falls back when the other runs out.
 */

const FOLD_TYPE_TONE: Record<FoldType, BadgeTone> = {
  valley: "neutral",
  mountain: "neutral",
  reverse: "accent",
  squash: "accent",
  petal: "accent",
  other: "cardboard",
};

/* Canvas dimensions, in CSS pixels. The default (500) keeps the whole player
   on one 1080p laptop viewport. */
const CANVAS_MIN = 320;
const CANVAS_MAX = 1000;
const CANVAS_STEP = 40;
const CANVAS_DEFAULT = 500;

/** Reading time granted on top of a fold's own animation before auto-advancing. */
const DWELL_MS = 1400;

/* Stable empty arrays: they are effect dependencies, so a fresh `[]` per
   render would restart the auto-play timer forever. */
const NO_TUTORIAL_STEPS: TutorialStep[] = [];
const NO_FOLD_STEPS: CraftFoldStep[] = [];

/** What the step panel needs, from either source. */
interface PlayerStep {
  stepNumber: number;
  foldType: FoldType;
  instruction: string;
}

export function FoldPlayer({
  tutorial,
  tutorials,
}: {
  tutorial: Tutorial;
  tutorials: Tutorial[];
}) {
  const tutorialSteps = tutorial.steps ?? NO_TUTORIAL_STEPS;
  const craftData: CraftFileData | null = tutorial.craftFile?.data ?? null;
  const foldSteps = craftData?.steps ?? NO_FOLD_STEPS;
  const foldData = foldSteps.length > 0 ? craftData : null;

  const totalSteps = Math.max(tutorialSteps.length, foldSteps.length);

  const [stepIndex, setStepIndex] = useState(0);
  const [canvasSize, setCanvasSize] = useState(CANVAS_DEFAULT);
  /* The box is `min(size, 100%)` of its column, so past the column width the
     control would keep counting up while nothing moved. Measuring the column
     gives the size control a ceiling that is actually true. */
  const [columnWidth, setColumnWidth] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settledStep, setSettledStep] = useState(-1);

  const safeIndex = totalSteps === 0 ? 0 : Math.min(stepIndex, totalSteps - 1);
  const maxCanvas =
    columnWidth === null
      ? CANVAS_MAX
      : Math.min(CANVAS_MAX, Math.floor(columnWidth));
  const effectiveSize = Math.max(CANVAS_MIN, Math.min(canvasSize, maxCanvas));

  const step = useMemo<PlayerStep | undefined>(() => {
    const written = tutorialSteps[safeIndex];
    if (written !== undefined) {
      return {
        stepNumber: written.stepNumber,
        foldType: written.foldType,
        instruction: written.instruction,
      };
    }

    const fold = foldSteps[safeIndex];
    if (fold !== undefined) {
      return {
        stepNumber: safeIndex + 1,
        foldType: fold.foldType,
        instruction: fold.instruction,
      };
    }

    return undefined;
  }, [tutorialSteps, foldSteps, safeIndex]);

  /* THE OFF-BY-ONE IS DELIBERATE. FoldStage counts folds COMPLETED, so a
     reader looking at step 1 must see the paper AFTER fold 1 has been made.
     Do not "fix" this to `safeIndex`. */
  const stageIndex = Math.min(safeIndex + 1, foldSteps.length);

  // A fold player is a slideshow; the arrow keys are the remote.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      setIsPlaying(false);
      setStepIndex((current) =>
        Math.max(0, Math.min(current + delta, totalSteps - 1)),
      );
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalSteps]);

  /* Auto-play. The timer is a ceiling, not the clock: `onFoldComplete` bumps
     `settledStep`, which re-runs this effect and re-arms it at just the dwell.
     Steps with no fold left to animate still advance on the ceiling. */
  useEffect(() => {
    if (!isPlaying || totalSteps === 0 || safeIndex >= totalSteps - 1) return;

    const foldPending =
      safeIndex < foldSteps.length && settledStep !== safeIndex;
    const wait =
      DWELL_MS + (foldPending ? (foldSteps[safeIndex]?.durationMs ?? 0) : 0);

    const next = safeIndex + 1;
    const timer = setTimeout(() => {
      setStepIndex(next);
      if (next >= totalSteps - 1) setIsPlaying(false);
    }, wait);

    return () => clearTimeout(timer);
  }, [isPlaying, safeIndex, totalSteps, foldSteps, settledStep]);

  /* Must be referentially stable: FoldStage lists it as a tween dependency, so
     a fresh closure would kill and restart a fold already in flight. */
  const indexRef = useRef(safeIndex);
  useEffect(() => {
    indexRef.current = safeIndex;
  }, [safeIndex]);
  const handleFoldComplete = useCallback(
    () => setSettledStep(indexRef.current),
    [],
  );

  const goToStep = (next: number) => {
    setIsPlaying(false);
    setStepIndex(Math.max(0, Math.min(next, Math.max(0, totalSteps - 1))));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cardboard">{tutorial.difficulty}</Badge>
        <Badge tone="neutral">
          {totalSteps} step{totalSteps === 1 ? "" : "s"}
        </Badge>
        <Badge tone="neutral">
          {formatDuration(tutorial.estimatedMinutes)}
        </Badge>
        {foldData === null ? null : <Badge tone="accent">Animated</Badge>}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          tutorials.length > 0
            ? "lg:grid-cols-[12rem_minmax(0,1fr)_18rem]"
            : "lg:grid-cols-[minmax(0,1fr)_18rem]",
        )}
      >
        {tutorials.length > 0 ? (
          <Sidebar tutorials={tutorials} currentSlug={tutorial.slug} />
        ) : null}

        <div className="flex min-w-0 flex-col gap-4">
          <FoldCanvas
            data={foldData}
            stageIndex={stageIndex}
            stepNumber={safeIndex + 1}
            totalSteps={totalSteps}
            size={effectiveSize}
            onMeasure={setColumnWidth}
            title={tutorial.title}
            onFoldComplete={handleFoldComplete}
          />

          <PaginationControls
            stepIndex={safeIndex}
            totalSteps={totalSteps}
            onChange={goToStep}
          />

          <PlaybackControls
            isPlaying={isPlaying}
            canPlay={totalSteps > 1 && safeIndex < totalSteps - 1}
            canRestart={safeIndex > 0}
            onTogglePlay={() => setIsPlaying((current) => !current)}
            onRestart={() => goToStep(0)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SizeControls
            size={effectiveSize}
            maxSize={maxCanvas}
            onShrink={() =>
              setCanvasSize(Math.max(CANVAS_MIN, effectiveSize - CANVAS_STEP))
            }
            onGrow={() =>
              setCanvasSize(Math.min(maxCanvas, effectiveSize + CANVAS_STEP))
            }
          />
          <StepPanel step={step} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ LEFT */

/** Every published tutorial, as links. The current fold is raised. */
function Sidebar({
  tutorials,
  currentSlug,
}: {
  tutorials: Tutorial[];
  currentSlug: string;
}) {
  return (
    <PaperSurface
      as="aside"
      material="cardboard"
      elevation={1}
      className="flex h-max flex-col gap-1 p-3"
    >
      <span className="px-2 pb-1 font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
        Tutorials
      </span>

      <nav aria-label="Tutorials" className="flex flex-col gap-0.5">
        {tutorials.map((item) => {
          const isActive = item.slug === currentSlug;

          return (
            <Link
              key={item.id}
              href={`/learn/${item.slug}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-[var(--radius-cut-sm)] px-3",
                "font-body text-base text-ink",
                isActive ? "surface-paper elevation-1" : undefined,
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </PaperSurface>
  );
}

/* ---------------------------------------------------------------- CANVAS */

/**
 * The stage. Sized by the user: width is `min(size, 100%)` and CSS keeps the
 * square, so a narrow screen caps at the column width while a wide one renders
 * at the requested pixel size.
 *
 * With no CraftFile the same box shows a folded-square mark, and the page
 * still reads perfectly well as a written step list.
 */
function FoldCanvas({
  data,
  stageIndex,
  stepNumber,
  totalSteps,
  size,
  title,
  onFoldComplete,
  onMeasure,
}: {
  data: CraftFileData | null;
  stageIndex: number;
  stepNumber: number;
  totalSteps: number;
  size: number;
  title: string;
  onFoldComplete: () => void;
  onMeasure: (width: number) => void;
}) {
  const columnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = columnRef.current;
    if (element === null) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) onMeasure(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onMeasure]);

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div ref={columnRef} className="w-full">
          <div
            style={{ width: `min(${size}px, 100%)` }}
            className="relative mx-auto flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-cut)] border border-crease bg-paper-sunken"
          >
            {data === null ? (
              <svg
                viewBox="0 0 24 24"
                className="size-16 text-ink-muted opacity-45"
                aria-hidden="true"
              >
                <path
                  d="M4 4h11l5 5v11H4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 4l5 5h-5z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              /* Absolutely filled rather than laid out as a flex item: as a flex
               child the stage sized itself from its own aspect ratio and stayed
               put while the box around it grew, so the canvas control appeared
               to do nothing. inset-0 ties the paper to the box instead. */
              <FoldStage
                data={data}
                stepIndex={stageIndex}
                onFoldComplete={onFoldComplete}
                ariaLabel={`${title}, step ${stepNumber} of ${totalSteps}`}
                className="absolute inset-0"
              />
            )}

            {totalSteps === 0 ? null : (
              <span className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <Badge tone="neutral" size="sm">
                  {stepNumber} of {totalSteps}
                </Badge>
              </span>
            )}
          </div>
        </div>

        <p className="text-center font-mono text-[0.625rem] tracking-[0.18em] text-ink-muted uppercase">
          {data === null
            ? "No fold animation for this tutorial yet"
            : "Fold animation"}{" "}
          - {size}px
        </p>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------ PAGINATION */

function PaginationControls({
  stepIndex,
  totalSteps,
  onChange,
}: {
  stepIndex: number;
  totalSteps: number;
  onChange: (index: number) => void;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= totalSteps - 1;

  return (
    <div
      className="flex items-center justify-between gap-3"
      aria-label="Fold steps"
    >
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled={isFirst || totalSteps === 0}
        onClick={() => onChange(stepIndex - 1)}
      >
        Previous
      </Button>

      <div className="flex flex-col items-center gap-1">
        <Badge tone="neutral">
          Step {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}
        </Badge>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-ink-muted uppercase">
          Use the left and right arrow keys
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled={isLast || totalSteps === 0}
        onClick={() => onChange(stepIndex + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function PlaybackControls({
  isPlaying,
  canPlay,
  canRestart,
  onTogglePlay,
  onRestart,
}: {
  isPlaying: boolean;
  canPlay: boolean;
  canRestart: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={!canPlay && !isPlaying}
        onClick={onTogglePlay}
      >
        {isPlaying ? "Pause" : "Play"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!canRestart}
        onClick={onRestart}
      >
        Restart
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------- RIGHT */

function SizeControls({
  size,
  maxSize,
  onShrink,
  onGrow,
}: {
  size: number;
  maxSize: number;
  onShrink: () => void;
  onGrow: () => void;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Canvas size</CardTitle>
          <Badge tone="neutral">{size}px</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={size <= CANVAS_MIN}
            onClick={onShrink}
            aria-label="Make the canvas smaller"
            className="flex-1"
          >
            -
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={size >= maxSize}
            onClick={onGrow}
            aria-label="Make the canvas larger"
            className="flex-1"
          >
            +
          </Button>
        </div>

        <p className="font-mono text-[0.625rem] tracking-[0.18em] text-ink-muted uppercase">
          {CANVAS_MIN}-{maxSize}px - square always
        </p>
      </CardBody>
    </Card>
  );
}

function StepPanel({ step }: { step: PlayerStep | undefined }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        {step === undefined ? (
          <>
            <CardTitle>Steps</CardTitle>
            <p>Steps for this tutorial have not been written yet.</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Step {step.stepNumber}</Badge>
              <Badge tone={FOLD_TYPE_TONE[step.foldType]}>
                {step.foldType}
              </Badge>
            </div>
            <p>{step.instruction}</p>
          </>
        )}
      </CardBody>
    </Card>
  );
}

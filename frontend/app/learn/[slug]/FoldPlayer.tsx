'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FoldType, Tutorial, TutorialStep } from '@foldify/shared';
import { Badge, type BadgeTone } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardTitle } from '@/app/components/ui/Card';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { cn, formatDuration } from '@/app/lib/utils';

/**
 * THE FOLD PLAYER SHELL.
 *
 * The interactive layout that will host the CraftMaker animation. Today the
 * canvas is a placeholder slot — the CraftFile format does not exist yet — but
 * the page is fully usable as a step-by-step guide:
 *
 *   left    a list of every tutorial, for hopping between folds
 *   centre  the canvas (animation slot) with a step pagination beneath it
 *   right   the current step — number, fold type and instruction
 *
 * The pagination is keyboard-accessible: ← and → step through the fold too.
 */

const FOLD_TYPE_TONE: Record<FoldType, BadgeTone> = {
  valley: 'neutral',
  mountain: 'neutral',
  reverse: 'accent',
  squash: 'accent',
  petal: 'accent',
  other: 'cardboard',
};

/* Canvas dimensions, in CSS pixels.
   The default (500) is chosen so the whole player — title, canvas and step
   pagination — fits on one 1080p laptop viewport. The user can grow it to
   1000px from the size control in the step column. */
const CANVAS_MIN = 320;
const CANVAS_MAX = 1000;
const CANVAS_STEP = 40;
const CANVAS_DEFAULT = 500;

export function FoldPlayer({ tutorial, tutorials }: { tutorial: Tutorial; tutorials: Tutorial[] }) {
  const steps = tutorial.steps ?? [];
  const totalSteps = steps.length;

  const [stepIndex, setStepIndex] = useState(0);
  const [canvasSize, setCanvasSize] = useState(CANVAS_DEFAULT);
  const safeIndex = totalSteps === 0 ? 0 : Math.min(stepIndex, totalSteps - 1);
  const step = totalSteps === 0 ? undefined : steps[safeIndex];

  // A fold player is a slideshow; the arrow keys are the remote.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        setStepIndex((current) => Math.max(0, current - 1));
      } else if (event.key === 'ArrowRight') {
        setStepIndex((current) => Math.min(totalSteps - 1, current + 1));
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalSteps]);

  const shrinkCanvas = () =>
    setCanvasSize((current) => Math.max(CANVAS_MIN, current - CANVAS_STEP));
  const growCanvas = () =>
    setCanvasSize((current) => Math.min(CANVAS_MAX, current + CANVAS_STEP));

  return (
    <div className="flex flex-col gap-4">
      {/* Above the canvas: difficulty, total steps and expected time. */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cardboard">{tutorial.difficulty}</Badge>
        <Badge tone="neutral">
          {totalSteps} step{totalSteps === 1 ? '' : 's'}
        </Badge>
        <Badge tone="neutral">{formatDuration(tutorial.estimatedMinutes)}</Badge>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          tutorials.length > 0
            ? 'lg:grid-cols-[12rem_minmax(0,1fr)_18rem]'
            : 'lg:grid-cols-[minmax(0,1fr)_18rem]',
        )}
      >
        {tutorials.length > 0 ? <Sidebar tutorials={tutorials} currentSlug={tutorial.slug} /> : null}

        <div className="flex min-w-0 flex-col gap-4">
          <CanvasPlaceholder
            stepNumber={safeIndex + 1}
            totalSteps={totalSteps}
            size={canvasSize}
          />

          <PaginationControls
            stepIndex={safeIndex}
            totalSteps={totalSteps}
            onChange={setStepIndex}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SizeControls
            size={canvasSize}
            onShrink={shrinkCanvas}
            onGrow={growCanvas}
          />
          <StepPanel step={step} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ LEFT */

/** Every published tutorial, as links. The current fold is raised. */
function Sidebar({ tutorials, currentSlug }: { tutorials: Tutorial[]; currentSlug: string }) {
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
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-[var(--radius-cut-sm)] px-3',
                'font-body text-base text-ink',
                isActive ? 'surface-paper elevation-1' : undefined,
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
 * The slot the CraftMaker fold animation will play in. Empty slot renders a
 * folded-square mark plus the step counter, so the page reads as Foldify even
 * before the player exists.
 *
 * Sized by the user: width is `min(size, 100%)` and the square aspect ratio is
 * kept by CSS, so on a narrow screen the canvas caps at the column width while
 * on a wide one it renders at the requested pixel size.
 */
function CanvasPlaceholder({
  stepNumber,
  totalSteps,
  size,
}: {
  stepNumber: number;
  totalSteps: number;
  size: number;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div
          style={{ width: `min(${size}px, 100%)` }}
          className="relative mx-auto flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-cut)] border border-crease bg-paper-sunken"
        >
          <svg viewBox="0 0 24 24" className="size-16 text-ink-muted opacity-45" aria-hidden="true">
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

          <span className="absolute inset-x-0 bottom-2 flex justify-center">
            <Badge tone="neutral" size="sm">
              {stepNumber} of {totalSteps}
            </Badge>
          </span>
        </div>

        <p className="text-center font-mono text-[0.625rem] tracking-[0.18em] text-ink-muted uppercase">
          Fold animation — CraftMaker slot · {size}px
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
    <div className="flex items-center justify-between gap-3" aria-label="Fold steps">
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
          Use the ← → keys
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

/* ----------------------------------------------------------------- RIGHT */

/** Canvas resize — sits above the step description, exactly where specified. */
function SizeControls({
  size,
  onShrink,
  onGrow,
}: {
  size: number;
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
            −
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={size >= CANVAS_MAX}
            onClick={onGrow}
            aria-label="Make the canvas larger"
            className="flex-1"
          >
            +
          </Button>
        </div>

        <p className="font-mono text-[0.625rem] tracking-[0.18em] text-ink-muted uppercase">
          {CANVAS_MIN}–{CANVAS_MAX}px · square always
        </p>
      </CardBody>
    </Card>
  );
}

function StepPanel({ step }: { step: TutorialStep | undefined }) {
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
              <Badge tone={FOLD_TYPE_TONE[step.foldType]}>{step.foldType}</Badge>
            </div>
            <p>{step.instruction}</p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
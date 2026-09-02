import type { FoldType, Tutorial, TutorialStep } from '@foldify/shared';
import { db } from '../index.ts';

/**
 * SQL only — see products.queries.ts for the rules.
 *
 * Tutorial rows use snake_case columns; this module maps them to the
 * camelCase fields defined in shared/types.ts.
 */

interface TutorialRow {
  id: number;
  slug: string;
  title: string;
  summary: string;
  difficulty: Tutorial['difficulty'];
  estimated_minutes: number;
  cover_image_url: string | null;
  is_published: number;
  created_at: string;
}

function mapTutorial(row: TutorialRow): Tutorial {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    coverImageUrl: row.cover_image_url,
    isPublished: row.is_published === 1,
    createdAt: row.created_at,
  };
}

/** Published tutorials, newest first. */
export function listPublishedTutorials(): Tutorial[] {
  const rows = db
    .prepare(
      `SELECT id, slug, title, summary, difficulty, estimated_minutes, cover_image_url,
              is_published, created_at
       FROM tutorials
       WHERE is_published = 1
       ORDER BY created_at DESC`,
    )
    .all() as TutorialRow[];

  return rows.map(mapTutorial);
}

export function getTutorialBySlug(slug: string): Tutorial | null {
  const row = db
    .prepare(
      `SELECT id, slug, title, summary, difficulty, estimated_minutes, cover_image_url,
              is_published, created_at
       FROM tutorials
       WHERE slug = ?`,
    )
    .get(slug) as TutorialRow | undefined;

  return row === undefined ? null : mapTutorial(row);
}

/** Record a view for analytics. */
export function recordTutorialView(tutorialId: number, userId: number | null): void {
  db.prepare(`INSERT INTO tutorial_views (tutorial_id, user_id) VALUES (?, ?)`).run(tutorialId, userId);
}

/* ---------------------------------------------------------------- steps */

interface TutorialStepRow {
  id: number;
  tutorial_id: number;
  step_number: number;
  instruction: string;
  fold_type: FoldType;
  image_url: string | null;
  craft_file_id: string | null;
}

function mapStep(row: TutorialStepRow): TutorialStep {
  return {
    id: row.id,
    tutorialId: row.tutorial_id,
    stepNumber: row.step_number,
    instruction: row.instruction,
    foldType: row.fold_type,
    imageUrl: row.image_url,
    craftFileId: row.craft_file_id,
  };
}

const SELECT_STEPS = `
  SELECT id, tutorial_id, step_number, instruction, fold_type, image_url, craft_file_id
  FROM tutorial_steps
`;

/** Ordered steps for one tutorial, ascending by step_number. Returns null if the tutorial has none. */
export function listStepsForTutorial(tutorialId: number): TutorialStep[] {
  const rows = db
    .prepare(`${SELECT_STEPS} WHERE tutorial_id = ? ORDER BY step_number ASC`)
    .all(tutorialId) as TutorialStepRow[];

  return rows.map(mapStep);
}

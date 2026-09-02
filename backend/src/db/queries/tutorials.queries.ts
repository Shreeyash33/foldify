import type {
  AppendTutorialStepRequest,
  FoldType,
  LinkedProduct,
  Tutorial,
  TutorialStep,
} from '@foldify/shared';
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

/**
 * The shop products this tutorial's fold is sold as, pre-folded, via the
 * tutorial_product_links join table. Only published products — a link to an
 * unpublished product would point at a 404 page.
 */
export function listLinkedProducts(tutorialId: number): LinkedProduct[] {
  const rows = db
    .prepare(
      `SELECT p.slug, p.name
       FROM tutorial_product_links l
       JOIN products p ON p.id = l.product_id
       WHERE l.tutorial_id = ? AND p.is_published = 1
       ORDER BY p.created_at ASC`,
    )
    .all(tutorialId) as { slug: string; name: string }[];

  return rows.map((row) => ({ slug: row.slug, name: row.name }));
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

/* ---------------------------------------------------------------- admin */

/** Every tutorial, published or not, newest first, for the admin tutorial manager. */
export function listAllTutorials(): Tutorial[] {
  const rows = db
    .prepare(
      `SELECT id, slug, title, summary, difficulty, estimated_minutes, cover_image_url,
              is_published, created_at
       FROM tutorials
       ORDER BY created_at DESC, id DESC`,
    )
    .all() as TutorialRow[];

  return rows.map(mapTutorial);
}

export function getTutorialById(id: number): Tutorial | null {
  const row = db
    .prepare(
      `SELECT id, slug, title, summary, difficulty, estimated_minutes, cover_image_url,
              is_published, created_at
       FROM tutorials
       WHERE id = ?`,
    )
    .get(id) as TutorialRow | undefined;

  return row === undefined ? null : mapTutorial(row);
}

export interface NewTutorial {
  slug: string;
  title: string;
  summary: string;
  difficulty: Tutorial['difficulty'];
  estimatedMinutes: number;
  coverImageUrl: string | null;
}

/** Create a tutorial, returning the created row. */
export function insertTutorial(input: NewTutorial): Tutorial {
  const result = db
    .prepare(
      `INSERT INTO tutorials (slug, title, summary, difficulty, estimated_minutes, cover_image_url)
       VALUES (@slug, @title, @summary, @difficulty, @estimatedMinutes, @coverImageUrl)`,
    )
    .run(input);

  const created = getTutorialById(Number(result.lastInsertRowid));
  if (created === null) throw new Error('Tutorial insert succeeded but the row could not be read back.');
  return created;
}

/** Partial update; `undefined` fields are left alone. Returns null when missing. */
export function updateTutorial(
  id: number,
  input: Partial<NewTutorial> & { isPublished?: boolean },
): Tutorial | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (input.slug !== undefined) { fields.push('slug = @slug'); params.slug = input.slug; }
  if (input.title !== undefined) { fields.push('title = @title'); params.title = input.title; }
  if (input.summary !== undefined) { fields.push('summary = @summary'); params.summary = input.summary; }
  if (input.difficulty !== undefined) { fields.push('difficulty = @difficulty'); params.difficulty = input.difficulty; }
  if (input.estimatedMinutes !== undefined) { fields.push('estimated_minutes = @estimatedMinutes'); params.estimatedMinutes = input.estimatedMinutes; }
  if (input.coverImageUrl !== undefined) { fields.push('cover_image_url = @coverImageUrl'); params.coverImageUrl = input.coverImageUrl; }
  if (input.isPublished !== undefined) { fields.push('is_published = @isPublished'); params.isPublished = input.isPublished ? 1 : 0; }

  if (fields.length === 0) return getTutorialById(id);
  db.prepare(`UPDATE tutorials SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getTutorialById(id);
}

/** Soft delete: unpublish so the steps row is preserved for later republishing. */
export function softDeleteTutorial(id: number): void {
  db.prepare('UPDATE tutorials SET is_published = 0 WHERE id = ?').run(id);
}

/**
 * Append a step to a tutorial. `step_number` is UNIQUE per tutorial, so the
 * next number is computed as MAX + 1 inside a transaction to stay correct
 * under concurrency. Returns the created step.
 */
export function appendTutorialStep(tutorialId: number, input: AppendTutorialStepRequest): TutorialStep {
  const run = db.transaction((): number => {
    const { next } = db
      .prepare(
        `SELECT COALESCE(MAX(step_number), 0) + 1 AS next FROM tutorial_steps WHERE tutorial_id = ?`,
      )
      .get(tutorialId) as { next: number };

    const result = db
      .prepare(
        `INSERT INTO tutorial_steps (tutorial_id, step_number, instruction, fold_type, image_url)
         VALUES (@tutorialId, @stepNumber, @instruction, @foldType, @imageUrl)`,
      )
      .run({
        tutorialId,
        stepNumber: next,
        instruction: input.instruction,
        foldType: input.foldType,
        imageUrl: input.imageUrl ?? null,
      });

    return Number(result.lastInsertRowid);
  });

  const row = db
    .prepare(`${SELECT_STEPS} WHERE id = ?`)
    .get(run()) as TutorialStepRow | undefined;
  if (row === undefined) throw new Error('Step insert succeeded but the row could not be read back.');
  return mapStep(row);
}

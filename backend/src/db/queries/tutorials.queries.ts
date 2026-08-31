import type { Tutorial } from '@foldify/shared';
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

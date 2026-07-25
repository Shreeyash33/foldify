import { Router } from 'express';
import type { ApiResponse, Tutorial } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { db } from '../db/index.ts';

const router: Router = Router();

/* ---------------------------------------------------------------- WORKING */

/**
 * GET /api/tutorials
 * Published tutorials, newest first. No steps — those come with the detail route.
 *
 * NOTE: this query belongs in db/queries/tutorials.queries.ts. It is inline here
 * only because that file does not exist yet; move it there as your first commit
 * on this module, mapping snake_case to camelCase the way products.queries.ts does.
 */
router.get('/', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, slug, title, summary, difficulty, estimated_minutes, cover_image_url,
              is_published, created_at
       FROM tutorials
       WHERE is_published = 1
       ORDER BY created_at DESC`,
    )
    .all() as {
    id: number;
    slug: string;
    title: string;
    summary: string;
    difficulty: Tutorial['difficulty'];
    estimated_minutes: number;
    cover_image_url: string | null;
    is_published: number;
    created_at: string;
  }[];

  const items: Tutorial[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    coverImageUrl: row.cover_image_url,
    isPublished: row.is_published === 1,
    createdAt: row.created_at,
  }));

  const body: ApiResponse<Tutorial[]> = { ok: true, data: items };
  res.json(body);
});

/* ------------------------------------------------------------------ STUBS */

/**
 * GET /api/tutorials/:slug
 * Purpose: one tutorial plus its ordered steps (ORDER BY step_number), for the
 * fold player. Two queries, or one join grouped in JS. Record a tutorial_views row.
 */
router.get('/:slug', () => {
  throw AppError.notImplemented('GET /api/tutorials/:slug is not built yet.');
});

/**
 * POST   /api/tutorials              — admin only. Create.
 * PATCH  /api/tutorials/:id          — admin only. Update.
 * POST   /api/tutorials/:id/steps    — admin only. Append a step; step_number is
 *                                      UNIQUE per tutorial, so compute MAX + 1
 *                                      inside a transaction.
 */

export default router;

import { Router } from 'express';
import type { ApiResponse } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { listPublishedTutorials } from '../db/queries/tutorials.queries.ts';

const router: Router = Router();

/* ---------------------------------------------------------------- WORKING */

/** GET /api/tutorials — published tutorials, newest first. */
router.get('/', (_req, res) => {
  const items = listPublishedTutorials();
  const body: ApiResponse<typeof items> = { ok: true, data: items };
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

import { Router } from 'express';
import type { ApiResponse } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import {
  getTutorialBySlug,
  listPublishedTutorials,
  listStepsForTutorial,
  recordTutorialView,
} from '../db/queries/tutorials.queries.ts';
import { attachUser } from '../middleware/requireAuth.ts';

const router: Router = Router();

/* ---------------------------------------------------------------- WORKING */

/** GET /api/tutorials — published tutorials, newest first. */
router.get('/', (_req, res) => {
  const items = listPublishedTutorials();
  const body: ApiResponse<typeof items> = { ok: true, data: items };
  res.json(body);
});

/**
 * GET /api/tutorials/:slug
 * One tutorial plus its ordered steps, for the tutorial page. Records a
 * tutorial_views row. `attachUser` rather than `requireAuth`: anonymous
 * visitors must still read tutorials, their view is simply recorded without a
 * user id — the same pattern as the product detail route.
 */
router.get('/:slug', attachUser, (req, res) => {
  const slug = req.params.slug;
  const tutorial = slug === undefined ? null : getTutorialBySlug(slug);
  if (tutorial === null || !tutorial.isPublished) throw AppError.notFound('No such tutorial.');

  try {
    recordTutorialView(tutorial.id, req.user?.id ?? null);
  } catch (err) {
    // Analytics must never break the page — a failed view insert is logged and dropped.
    console.error('[foldify] tutorial view insert failed:', err);
  }

  const body: ApiResponse<typeof tutorial> = {
    ok: true,
    data: { ...tutorial, steps: listStepsForTutorial(tutorial.id) },
  };
  res.json(body);
});

/**
 * POST   /api/tutorials              — admin only. Create.
 * PATCH  /api/tutorials/:id          — admin only. Update.
 * POST   /api/tutorials/:id/steps    — admin only. Append a step; step_number is
 *                                      UNIQUE per tutorial, so compute MAX + 1
 *                                      inside a transaction.
 */

export default router;

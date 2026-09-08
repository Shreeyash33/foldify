import { Router } from 'express';
import type {
  ApiResponse,
  AppendTutorialStepRequest,
  CreateTutorialRequest,
  FoldType,
  Tutorial,
  TutorialStep,
  UpdateTutorialRequest,
} from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import {
  appendTutorialStep,
  getTutorialById,
  getTutorialBySlug,
  insertTutorial,
  listAllTutorials,
  listLinkedProducts,
  listPublishedTutorials,
  listStepsForTutorial,
  recordTutorialView,
  softDeleteTutorial,
  updateTutorial,
} from '../db/queries/tutorials.queries.ts';
import { getCraftFileForTutorial } from '../db/queries/craft.queries.ts';
import {
  isPositiveInteger,
  isSlug,
  isString,
  maxLength,
  minLength,
  oneOf,
  optional,
  required,
  validateBody,
} from '../lib/validate.ts';
import { attachUser, requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
const FOLD_TYPES = ['valley', 'mountain', 'reverse', 'squash', 'petal', 'other'] as const;

const router: Router = Router();

/* ---------------------------------------------------------------- WORKING */

/** GET /api/tutorials — published tutorials, newest first. */
router.get('/', (_req, res) => {
  const items = listPublishedTutorials();
  const body: ApiResponse<typeof items> = { ok: true, data: items };
  res.json(body);
});

/**
 * GET /api/tutorials/all — every tutorial, published or not, for the admin
 * tutorial manager. Registered before `/:slug`, whose detail route would
 * otherwise swallow the literal path "all".
 */
router.get(
  '/all',
  requireAuth,
  requireAdmin,
  (_req, res) => {
    const body: ApiResponse<Tutorial[]> = { ok: true, data: listAllTutorials() };
    res.json(body);
  },
);

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
    data: {
      ...tutorial,
      steps: listStepsForTutorial(tutorial.id),
      linkedProducts: listLinkedProducts(tutorial.id),
      craftFile: getCraftFileForTutorial(tutorial.id),
    },
  };
  res.json(body);
});

/**
 * POST /api/tutorials — admin only. Create a tutorial with no steps; steps
 * are appended via POST /:id/steps.
 */
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const body = validateBody<CreateTutorialRequest>(req.body, {
    slug: [required, isSlug, maxLength(120)],
    title: [required, minLength(2), maxLength(120)],
    summary: [required, maxLength(2000)],
    difficulty: [required, oneOf(DIFFICULTIES)],
    estimatedMinutes: [required, isPositiveInteger],
    coverImageUrl: [optional(isString), maxLength(500)],
  });

  const existing = getTutorialBySlug(body.slug);
  if (existing !== null) throw AppError.conflict(`A tutorial with the slug "${body.slug}" already exists.`);

  const created = insertTutorial({
    slug: body.slug.trim(),
    title: body.title.trim(),
    summary: body.summary.trim(),
    difficulty: body.difficulty,
    estimatedMinutes: body.estimatedMinutes,
    coverImageUrl: body.coverImageUrl === undefined ? null : body.coverImageUrl ?? null,
  });

  const response: ApiResponse<Tutorial> = { ok: true, data: created };
  res.status(201).json(response);
});

/** Loads the tutorial named in the URL by id, for the admin endpoints below. */
function requireTutorialById(idRaw: string | undefined): Tutorial {
  const id = Number.parseInt(idRaw ?? '', 10);
  const tutorial = Number.isNaN(id) ? null : getTutorialById(id);
  if (tutorial === null) throw AppError.notFound('No such tutorial.');
  return tutorial;
}

/**
 * PATCH /api/tutorials/:id — admin only. Partial update; only supplied
 * fields are written.
 */
router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
  const tutorial = requireTutorialById(req.params.id);
  const body = validateBody<UpdateTutorialRequest>(req.body, {
    slug: [optional(isSlug), maxLength(120)],
    title: [optional(minLength(2)), maxLength(120)],
    summary: [optional(isString), maxLength(2000)],
    difficulty: [optional(oneOf(DIFFICULTIES))],
    estimatedMinutes: [optional(isPositiveInteger)],
    coverImageUrl: [optional(isString), maxLength(500)],
    isPublished: [optional(isTutorialPublishFlag)],
  });

  if (body.slug !== undefined) {
    const conflict = getTutorialBySlug(body.slug);
    if (conflict !== null && conflict.id !== tutorial.id) {
      throw AppError.conflict(`A tutorial with the slug "${body.slug}" already exists.`);
    }
  }

  const updated = updateTutorial(tutorial.id, body);
  if (updated === null) throw AppError.notFound('No such tutorial.');

  const response: ApiResponse<Tutorial> = { ok: true, data: updated };
  res.json(response);
});

/**
 * DELETE /api/tutorials/:id — admin only. Soft delete (unpublish): notes and
 * steps are preserved so the tutorial can be republished later.
 */
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const tutorial = requireTutorialById(req.params.id);
  softDeleteTutorial(tutorial.id);

  const response: ApiResponse<{ deleted: true }> = { ok: true, data: { deleted: true } };
  res.json(response);
});

/**
 * POST /api/tutorials/:id/steps — admin only. Append a step; the step_number
 * is computed as MAX + 1 inside a transaction (see appendTutorialStep).
 */
router.post('/:id/steps', requireAuth, requireAdmin, (req, res) => {
  const tutorial = requireTutorialById(req.params.id);
  const body = validateBody<AppendTutorialStepRequest>(req.body, {
    instruction: [required, minLength(3), maxLength(2000)],
    foldType: [required, oneOf<FoldType>(FOLD_TYPES)],
    imageUrl: [optional(isString), maxLength(500)],
  });

  const step = appendTutorialStep(tutorial.id, body);

  const response: ApiResponse<TutorialStep> = { ok: true, data: step };
  res.status(201).json(response);
});

/** A 0/1 x-www-form boolean is silently dropped as text; accept both. */
function isTutorialPublishFlag(value: unknown, field: string): string | null {
  return value === true || value === false || value === 0 || value === 1
    ? null
    : `${field} must be true or false.`;
}

export default router;

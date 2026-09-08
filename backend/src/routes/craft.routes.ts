import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type {
  ApiResponse,
  CraftFile,
  CraftFileVersion,
  CraftStatus,
  SaveCraftFileRequest,
} from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import {
  deleteCraftFile,
  getCraftFileById,
  getCraftFileForTutorial,
  insertCraftFile,
  listCraftFileVersions,
  listCraftFiles,
  restoreCraftFileVersion,
  updateCraftFile,
} from '../db/queries/craft.queries.ts';
import {
  maxLength,
  minLength,
  oneOf,
  optional,
  required,
  validateBody,
  type Rule,
} from '../lib/validate.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';

/**
 * Craft Maker fold files. Admin only, end to end: these are authoring
 * endpoints, and the fold a reader sees arrives on the tutorial detail
 * response instead (GET /api/tutorials/:slug).
 */

/** A fold sequence longer than this is a runaway loop in the editor, not a model. */
const MAX_STEPS = 200;

const CRAFT_STATUSES: readonly CraftStatus[] = ['draft', 'deployed'];

const router: Router = Router();

/** GET /api/craft-files — every fold file, newest first. */
router.get('/', requireAuth, requireAdmin, (_req, res) => {
  const body: ApiResponse<CraftFile[]> = { ok: true, data: listCraftFiles() };
  res.json(body);
});

/** GET /api/craft-files/:id */
router.get('/:id', requireAuth, requireAdmin, (req, res) => {
  const body: ApiResponse<CraftFile> = { ok: true, data: requireCraftFileById(req.params.id) };
  res.json(body);
});

/** POST /api/craft-files — create. The id is generated here, never accepted from the client. */
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const body = validateSaveBody(req.body);
  const tutorialId = body.tutorialId ?? null;
  if (tutorialId !== null) assertTutorialFree(tutorialId, null);

  const created = insertCraftFile(randomUUID(), {
    name: body.name.trim(),
    tutorialId,
    status: body.status,
    data: body.data,
  });

  const response: ApiResponse<CraftFile> = { ok: true, data: created };
  res.status(201).json(response);
});

/**
 * PATCH /api/craft-files/:id — a full replace of name/tutorialId/data despite
 * the verb: the Craft Maker always holds the whole fold in memory, so a partial
 * save would only invite two half-written versions of the same sequence.
 */
router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = requireCraftFileById(req.params.id);
  const body = validateSaveBody(req.body);
  const tutorialId = body.tutorialId ?? null;
  if (tutorialId !== null) assertTutorialFree(tutorialId, existing.id);

  const updated = updateCraftFile(existing.id, {
    name: body.name.trim(),
    tutorialId,
    status: body.status,
    data: body.data,
  });
  if (updated === null) throw AppError.notFound('No such craft file.');

  const response: ApiResponse<CraftFile> = { ok: true, data: updated };
  res.json(response);
});

/** DELETE /api/craft-files/:id — hard delete; a draft fold has no orders hanging off it. */
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = requireCraftFileById(req.params.id);
  deleteCraftFile(existing.id);

  const response: ApiResponse<{ deleted: true }> = { ok: true, data: { deleted: true } };
  res.json(response);
});

/** GET /api/craft-files/:id/versions — the project's history, newest revision first. */
router.get('/:id/versions', requireAuth, requireAdmin, (req, res) => {
  const existing = requireCraftFileById(req.params.id);

  const body: ApiResponse<CraftFileVersion[]> = { ok: true, data: listCraftFileVersions(existing.id) };
  res.json(body);
});

/**
 * POST /api/craft-files/:id/versions/:revision/restore — puts an earlier
 * revision back on the file. The restore is itself a save, so it is undoable.
 */
router.post('/:id/versions/:revision/restore', requireAuth, requireAdmin, (req, res) => {
  const existing = requireCraftFileById(req.params.id);

  const revision = Number(req.params.revision);
  if (!Number.isInteger(revision) || revision < 1) throw AppError.notFound('No such revision.');

  const restored = restoreCraftFileVersion(existing.id, revision);
  if (restored === null) throw AppError.notFound('No such revision.');

  const body: ApiResponse<CraftFile> = { ok: true, data: restored };
  res.json(body);
});

function requireCraftFileById(idRaw: string | undefined): CraftFile {
  const file = idRaw === undefined ? null : getCraftFileById(idRaw);
  if (file === null) throw AppError.notFound('No such craft file.');
  return file;
}

/** A tutorial holds at most one fold — the UNIQUE column would otherwise raise a raw 500. */
function assertTutorialFree(tutorialId: number, selfId: string | null): void {
  const held = getCraftFileForTutorial(tutorialId);
  if (held !== null && held.id !== selfId) {
    throw AppError.conflict(`Tutorial ${tutorialId} already has a craft file ("${held.name}").`);
  }
}

function validateSaveBody(body: unknown): SaveCraftFileRequest {
  return validateBody<SaveCraftFileRequest>(body, {
    name: [required, minLength(2), maxLength(120)],
    tutorialId: [isTutorialIdOrNull],
    status: [optional(oneOf(CRAFT_STATUSES))],
    data: [required, isCraftData],
  });
}

/** Optional, but `null` is meaningful here (detach), so `optional` is too permissive. */
const isTutorialIdOrNull: Rule = (value, field) => {
  if (value === undefined || value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? null
    : `${field} must be a tutorial id, or null.`;
};

function isFinitePoint(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as { x?: unknown; y?: unknown };
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

/**
 * A structural sanity check, not a full schema: enough that the player cannot
 * be handed a sheet with no size or a fold line made of NaN. Anything subtler
 * is the Craft Maker's problem, and a bad blob here is a 400 rather than a
 * crash when the row is next read back.
 */
const isCraftData: Rule = (value, field) => {
  if (typeof value !== 'object' || value === null) return `${field} must be a craft file body.`;
  const data = value as { sheet?: unknown; steps?: unknown };

  if (typeof data.sheet !== 'object' || data.sheet === null) return `${field}.sheet is required.`;
  const sheet = data.sheet as { width?: unknown; height?: unknown };
  if (
    !Number.isFinite(sheet.width) ||
    !Number.isFinite(sheet.height) ||
    (sheet.width as number) <= 0 ||
    (sheet.height as number) <= 0
  ) {
    return `${field}.sheet must have a positive width and height.`;
  }

  if (!Array.isArray(data.steps)) return `${field}.steps must be a list of folds.`;
  if (data.steps.length > MAX_STEPS) return `${field}.steps must hold at most ${MAX_STEPS} folds.`;

  for (const [index, step] of data.steps.entries()) {
    if (typeof step !== 'object' || step === null) return `${field}.steps[${index}] is not a fold.`;
    const fold = step as { from?: unknown; to?: unknown };
    if (!isFinitePoint(fold.from) || !isFinitePoint(fold.to)) {
      return `${field}.steps[${index}] needs numeric from.x/from.y and to.x/to.y.`;
    }
  }

  return null;
};

export default router;

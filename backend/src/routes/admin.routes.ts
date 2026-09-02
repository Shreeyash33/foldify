import { Router } from 'express';
import type { AdminOverview, ApiResponse } from '@foldify/shared';
import { getOverviewCounts } from '../db/queries/metrics.queries.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';

/**
 * GET /api/admin/overview — admin only.
 * Aggregate counts for the admin Overview page: orders, stock, traffic and
 * inbox status as plain numbers. No charts in the first version.
 */

const router: Router = Router();

router.get('/overview', requireAuth, requireAdmin, (_req, res) => {
  const body: ApiResponse<AdminOverview> = { ok: true, data: getOverviewCounts() };
  res.json(body);
});

export default router;
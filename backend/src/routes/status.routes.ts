import { Router } from 'express';
import type { ApiResponse, StatusResponse } from '@foldify/shared';
import { getStatus } from '../services/status.service.ts';

const router: Router = Router();

/**
 * GET /api/status — fully implemented.
 * Real data: module health, DB connectivity, uptime, version.
 * The frontend showcase page renders this live.
 */
router.get('/', (_req, res) => {
  const body: ApiResponse<StatusResponse> = { ok: true, data: getStatus() };
  res.json(body);
});

export default router;

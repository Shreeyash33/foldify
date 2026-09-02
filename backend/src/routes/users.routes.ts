import { Router } from 'express';
import type { ApiResponse, AdminUser, Role, UpdateUserRoleRequest, User } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { oneOf, required, validateBody } from '../lib/validate.ts';
import { listUsersWithStats, getUserById, updateUserRole } from '../db/queries/users.queries.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';

/**
 * Users are an admin-only surface: the list exposes every account's spend and
 * order count, and a role change is the most consequential write in the app.
 * The whole router sits behind requireAuth + requireAdmin.
 */

const ROLES = ['customer', 'admin'] as const;

const router: Router = Router();

router.use(requireAuth, requireAdmin);

/* ---------------------------------------------------------------- WORKING */

/**
 * GET /api/users — admin only. Every account, newest first, with live order
 * count and total spend. The query never selects password_hash.
 */
router.get('/', (_req, res) => {
  const body: ApiResponse<AdminUser[]> = { ok: true, data: listUsersWithStats() };
  res.json(body);
});

/**
 * PATCH /api/users/:id/role — admin only. Promote or demote an account.
 *
 * The one rule nobody writes a ticket for: an admin cannot demote themself.
 * Doing so would lock a real account out of the only page that can reverse
 * the decision. Everything else is delegated to the authz middleware above.
 */
router.patch('/:id/role', (req, res) => {
  const id = Number.parseInt(req.params.id ?? '', 10);
  const target = Number.isNaN(id) ? null : getUserById(id);
  if (target === null) throw AppError.notFound('No such user.');

  if (req.user !== undefined && req.user.id === target.id) {
    throw AppError.conflict('You cannot change your own role — you would lock yourself out.');
  }

  const body = validateBody<UpdateUserRoleRequest>(req.body, {
    role: [required, oneOf<Role>(ROLES)],
  });

  const updated = updateUserRole(target.id, body.role);
  if (updated === null) throw AppError.notFound('No such user.');

  const response: ApiResponse<User> = { ok: true, data: updated };
  res.json(response);
});

export default router;
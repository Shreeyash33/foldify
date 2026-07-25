import { Router } from 'express';
import type { ApiResponse, ContactRequest } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { isEmail, maxLength, minLength, required, validateBody } from '../lib/validate.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';
import { db } from '../db/index.ts';

const router: Router = Router();

/* ---------------------------------------------------------------- WORKING */

/**
 * POST /api/contact — public. Stores a message from the contact form.
 * The smallest complete example of the whole stack: validate, insert, respond.
 */
router.post('/', (req, res) => {
  const body = validateBody<ContactRequest>(req.body, {
    name: [required, minLength(2), maxLength(80)],
    email: [required, isEmail],
    subject: [required, minLength(3), maxLength(120)],
    body: [required, minLength(10), maxLength(2000)],
  });

  db.prepare(
    `INSERT INTO contact_messages (name, email, subject, body)
     VALUES (@name, @email, @subject, @body)`,
  ).run({
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    subject: body.subject.trim(),
    body: body.body.trim(),
  });

  const response: ApiResponse<{ received: true }> = { ok: true, data: { received: true } };
  res.status(201).json(response);
});

/* ------------------------------------------------------------------ STUBS */

/**
 * GET /api/contact — admin only. List messages, unhandled first, for the admin inbox.
 */
router.get('/', requireAuth, requireAdmin, () => {
  throw AppError.notImplemented('GET /api/contact is not built yet.');
});

/**
 * PATCH /api/contact/:id — admin only. Mark a message handled (is_handled = 1).
 */

export default router;

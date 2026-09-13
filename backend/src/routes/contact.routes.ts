import { Router } from 'express';
import type { ApiResponse, ContactMessage, ContactRequest, UpdateContactMessageRequest } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { isEmail, maxLength, minLength, required, validateBody } from '../lib/validate.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';
import {
  getContactMessage,
  insertContactMessage,
  listContactMessages,
  setContactArchived,
  setContactHandled,
} from '../db/queries/contact.queries.ts';

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

  insertContactMessage(body);

  const response: ApiResponse<{ received: true }> = { ok: true, data: { received: true } };
  res.status(201).json(response);
});

/* ------------------------------------------------------------------ ADMIN */

/**
 * GET /api/contact — admin only. The whole inbox in one call: unhandled
 * messages first, then the rest newest-first. Small enough by design that
 * pagination would be ceremony.
 */
router.get('/', requireAuth, requireAdmin, (_req, res) => {
  const body: ApiResponse<ContactMessage[]> = { ok: true, data: listContactMessages() };
  res.json(body);
});

/**
 * PATCH /api/contact/:id — admin only.
 * Set `isHandled` to mark a message done (reopened when false), set
 * `isArchived` to move it into the archived drawer (restored when false).
 * Either field may be sent; any subset is valid. At least one must be present.
 */
router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id ?? '', 10);
  const message = Number.isNaN(id) ? null : getContactMessage(id);
  if (message === null) throw AppError.notFound('No such message.');

  const body = validateBody<UpdateContactMessageRequest>(req.body, {
    isHandled: [isBooleanFlag],
    isArchived: [isBooleanFlag],
  });

  if (body.isHandled === undefined && body.isArchived === undefined) {
    throw new AppError(400, 'BAD_REQUEST', 'Send isHandled and/or isArchived.', {
      isHandled: 'At least one of isHandled / isArchived is required.',
      isArchived: 'At least one of isHandled / isArchived is required.',
    });
  }

  let updated: ContactMessage | null = null;
  if (body.isArchived !== undefined) {
    updated = setContactArchived(message.id, body.isArchived);
  }
  if (body.isHandled !== undefined && updated !== null) {
    updated = setContactHandled(message.id, body.isHandled);
  }
  if (updated === null) throw AppError.notFound('No such message.');

  const response: ApiResponse<ContactMessage> = { ok: true, data: updated };
  res.json(response);
});

/** The inbox toggles are booleans; a 0/1 integer from a form is accepted too. */
function isBooleanFlag(value: unknown, field: string): string | null {
  return value === true || value === false || value === 0 || value === 1
    ? null
    : `${field} must be true or false.`;
}

export default router;
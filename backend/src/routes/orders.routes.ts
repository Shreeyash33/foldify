import { Router } from 'express';
import type { ApiResponse, Order } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import { db } from '../db/index.ts';

const router: Router = Router();

// Every order route needs a signed-in user.
router.use(requireAuth);

/* ---------------------------------------------------------------- WORKING */

/**
 * GET /api/orders — the signed-in user's own orders, newest first.
 * Scoped by req.user.id, never by a user id from the query string: that would
 * let anyone read anyone else's orders by changing a number in the URL.
 */
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, user_id, status, total_minor, currency, shipping_name, shipping_phone,
              shipping_address, shipping_city, payment_ref, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .all(req.user!.id) as {
    id: number;
    user_id: number;
    status: Order['status'];
    total_minor: number;
    currency: 'NPR';
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
    payment_ref: string | null;
    created_at: string;
  }[];

  const items: Order[] = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    totalMinor: row.total_minor,
    currency: row.currency,
    shippingName: row.shipping_name,
    shippingPhone: row.shipping_phone,
    shippingAddress: row.shipping_address,
    shippingCity: row.shipping_city,
    paymentRef: row.payment_ref,
    createdAt: row.created_at,
  }));

  const body: ApiResponse<Order[]> = { ok: true, data: items };
  res.json(body);
});

/* ------------------------------------------------------------------ STUBS */

/**
 * POST /api/orders
 * Purpose: turn the client-side cart into an order.
 *
 * Critical: the request sends product ids and quantities ONLY. Re-read every
 * price from the products table server-side and compute the total there. A
 * total posted by the browser is a total the customer chose.
 *
 * Wrap the whole thing in db.transaction(): insert the order, insert each
 * order_item with a price snapshot, decrement stock, all or nothing.
 * Then paymentService.initiate(total, orderId).
 */
router.post('/', () => {
  throw AppError.notImplemented('POST /api/orders is not built yet.');
});

/**
 * GET   /api/orders/:id           — one order with its items; 404 unless it belongs
 *                                   to req.user (or req.user is an admin).
 * POST  /api/orders/:id/verify    — paymentService.verify(), then set status = 'paid'.
 * PATCH /api/orders/:id/status    — admin only. Status must be one of the CHECK values.
 */

export default router;

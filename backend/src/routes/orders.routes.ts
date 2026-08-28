import { Router } from 'express';
import type { Request } from 'express';
import type { ApiResponse, CreateOrderRequest, CreateOrderResponse, Order } from '@foldify/shared';
import {
  getOrderById,
  insertOrder,
  listOrdersForUser,
  setOrderStatus,
  type NewOrderItem,
} from '../db/queries/orders.queries.ts';
import { getProductById } from '../db/queries/products.queries.ts';
import { AppError } from '../lib/errors.ts';
import { isString, maxLength, required, validateBody } from '../lib/validate.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/requireAuth.ts';
import * as paymentService from '../services/payment.service.ts';

const router: Router = Router();

// Every order route needs a signed-in user.
router.use(requireAuth);

/**
 * Loads the order named in the URL.
 *
 * An order belonging to someone else answers 404, not 403: a 403 tells whoever
 * is walking the id space that the order exists.
 */
function loadVisibleOrder(req: Request): Order {
  const id = Number.parseInt(req.params.id ?? '', 10);
  const order = Number.isNaN(id) ? null : getOrderById(id);

  if (order === null || (order.userId !== req.user!.id && req.user!.role !== 'admin')) {
    throw AppError.notFound('Order not found.');
  }
  return order;
}

/** Reads `items` out of an untrusted body: product ids and quantities only. */
function parseRequestedItems(body: unknown): { productId: number; quantity: number }[] {
  const raw = (body as { items?: unknown } | null)?.items;

  if (!Array.isArray(raw) || raw.length === 0) {
    throw AppError.badRequest('An order needs at least one item.', {
      items: 'items must be a non-empty array of { productId, quantity }.',
    });
  }

  // Duplicate lines are merged so the stock check below sees the true quantity.
  const merged = new Map<number, number>();

  raw.forEach((entry, index) => {
    const line = (typeof entry === 'object' && entry !== null ? entry : {}) as {
      productId?: unknown;
      quantity?: unknown;
    };

    if (!Number.isInteger(line.productId) || (line.productId as number) < 1) {
      throw AppError.badRequest(`items[${index}].productId must be a product id.`);
    }
    if (!Number.isInteger(line.quantity) || (line.quantity as number) < 1) {
      throw AppError.badRequest(`items[${index}].quantity must be a whole number of 1 or more.`);
    }

    const productId = line.productId as number;
    merged.set(productId, (merged.get(productId) ?? 0) + (line.quantity as number));
  });

  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

/* ---------------------------------------------------------------- WORKING */

/**
 * GET /api/orders — the signed-in user's own orders, newest first.
 * Scoped by req.user.id, never by a user id from the query string: that would
 * let anyone read anyone else's orders by changing a number in the URL.
 */
router.get('/', (req, res) => {
  const body: ApiResponse<Order[]> = { ok: true, data: listOrdersForUser(req.user!.id) };
  res.json(body);
});

/**
 * POST /api/orders — turns the client-side cart into an order.
 *
 * The request carries product ids and quantities only. Every price is re-read
 * from the products table and the total is added up here, because a total
 * posted by the browser is a total the customer chose.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const shipping = validateBody<Omit<CreateOrderRequest, 'items'>>(req.body, {
      shippingName: [required, isString, maxLength(120)],
      shippingPhone: [required, isString, maxLength(40)],
      shippingAddress: [required, isString, maxLength(400)],
      shippingCity: [required, isString, maxLength(80)],
    });

    const items: NewOrderItem[] = parseRequestedItems(req.body).map(({ productId, quantity }) => {
      const product = getProductById(productId);
      if (product === null) throw AppError.notFound(`No product with id ${productId}.`);
      if (quantity > product.stock) {
        throw AppError.conflict(`Only ${product.stock} left of "${product.name}".`);
      }
      return {
        productId,
        productName: product.name,
        unitPriceMinor: product.priceMinor,
        quantity,
      };
    });

    const totalMinor = items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);

    const order = insertOrder({
      userId: req.user!.id,
      totalMinor,
      shippingName: shipping.shippingName.trim(),
      shippingPhone: shipping.shippingPhone.trim(),
      shippingAddress: shipping.shippingAddress.trim(),
      shippingCity: shipping.shippingCity.trim(),
      items,
    });

    // The gateway call is awaited outside insertOrder: better-sqlite3
    // transactions are synchronous and cannot hold an open await.
    const payment = await paymentService.initiate(order.totalMinor, order.id);
    setOrderStatus(order.id, order.status, payment.reference);

    const body: ApiResponse<CreateOrderResponse> = {
      ok: true,
      data: { order: { ...order, paymentRef: payment.reference }, payment },
    };
    res.status(201).json(body);
  }),
);

/** GET /api/orders/:id — one order with its items. */
router.get('/:id', (req, res) => {
  const body: ApiResponse<Order> = { ok: true, data: loadVisibleOrder(req) };
  res.json(body);
});

/**
 * POST /api/orders/:id/verify — confirms payment with the provider.
 *
 * The result comes from paymentService, never from a success flag posted by the
 * browser: the browser is the one party with a reason to lie about it.
 */
router.post(
  '/:id/verify',
  asyncHandler(async (req, res) => {
    const order = loadVisibleOrder(req);
    if (order.paymentRef === null) {
      throw AppError.badRequest('That order has no payment to verify.');
    }

    const verification = await paymentService.verify(order.paymentRef);

    // Only 'pending' is promoted — a shipped order must not walk back to 'paid'.
    if (verification.status === 'success' && order.status === 'pending') {
      setOrderStatus(order.id, 'paid');
    }

    const updated = getOrderById(order.id);
    if (updated === null) throw AppError.notFound('Order not found.');

    const body: ApiResponse<Order> = { ok: true, data: updated };
    res.json(body);
  }),
);

/**
 * PATCH /api/orders/:id/status    — admin only. Status must be one of the CHECK values.
 */

export default router;

import { Router } from 'express';
import type {
  ApiResponse,
  CreateReviewRequest,
  Paginated,
  Product,
  ProductDetail,
  ProductFilters,
  Review,
} from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { isInteger, maxLength, queryInt, required, validateBody, type Rule } from '../lib/validate.ts';
import { getProductBySlug, listProducts, recordProductView } from '../db/queries/products.queries.ts';
import {
  getReviewStats,
  insertReview,
  listReviewsForProduct,
} from '../db/queries/reviews.queries.ts';
import { attachUser, requireAuth } from '../middleware/requireAuth.ts';

const router: Router = Router();

/* ---------------------------------------------------------------- WORKING */

/**
 * GET /api/products?category=&difficulty=&search=&sort=&page=&perPage=
 * Returns a paginated, filtered product list straight from SQLite.
 * Empty until `npm run seed` has been run.
 */
router.get('/', (req, res) => {
  const filters: ProductFilters = {
    page: queryInt(req.query.page, 1, 1, 10_000),
    perPage: queryInt(req.query.perPage, 12, 1, 60),
  };

  if (typeof req.query.category === 'string') filters.categorySlug = req.query.category;
  if (typeof req.query.search === 'string') filters.search = req.query.search;

  if (req.query.difficulty === 'beginner' || req.query.difficulty === 'intermediate' || req.query.difficulty === 'advanced') {
    filters.difficulty = req.query.difficulty;
  }

  if (
    req.query.sort === 'newest' ||
    req.query.sort === 'price-asc' ||
    req.query.sort === 'price-desc' ||
    req.query.sort === 'name'
  ) {
    filters.sort = req.query.sort;
  }

  const body: ApiResponse<Paginated<Product>> = { ok: true, data: listProducts(filters) };
  res.json(body);
});

/** No rule in lib/validate.ts covers a numeric range, and only ratings need one. */
function inRange(min: number, max: number): Rule {
  return (value, field) =>
    typeof value === 'number' && value >= min && value <= max
      ? null
      : `${field} must be between ${min} and ${max}.`;
}

/** Shared by the three routes below: the slug either resolves or the request is a 404. */
function requireProductBySlug(slug: string | undefined): Product {
  const product = slug === undefined ? null : getProductBySlug(slug);
  if (product === null) throw AppError.notFound('No such product.');
  return product;
}

/**
 * The `/:slug/reviews` routes are registered before `/:slug` so a change to
 * Express's matching order cannot let the single-segment pattern swallow them.
 */

/**
 * GET /api/products/:slug/reviews
 * The review list on its own, for clients that already hold the product.
 */
router.get('/:slug/reviews', (req, res) => {
  const product = requireProductBySlug(req.params.slug);

  const body: ApiResponse<Review[]> = { ok: true, data: listReviewsForProduct(product.id) };
  res.json(body);
});

/**
 * POST /api/products/:slug/reviews
 * One review per user per product, enforced by UNIQUE (product_id, user_id).
 */
router.post('/:slug/reviews', requireAuth, (req, res) => {
  const product = requireProductBySlug(req.params.slug);

  const body = validateBody<CreateReviewRequest>(req.body, {
    rating: [required, isInteger, inRange(1, 5)],
    body: [required, maxLength(2000)],
  });

  const user = req.user;
  if (user === undefined) throw AppError.unauthorized();

  let review: Review;
  try {
    review = insertReview({
      productId: product.id,
      userId: user.id,
      rating: body.rating,
      body: body.body,
    });
  } catch (err) {
    // The duplicate is a client-visible 409, not a 500. Matched on the driver's
    // error code rather than the message text, which is not part of any contract.
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw AppError.conflict('You have already reviewed this product.');
    }
    throw err;
  }

  const response: ApiResponse<Review> = { ok: true, data: review };
  res.status(201).json(response);
});

/**
 * GET /api/products/:slug
 * One product for the detail page, with its reviews and rating aggregates.
 * `attachUser` rather than `requireAuth`: anonymous visitors must still get the
 * page, their view is simply recorded without a user id.
 */
router.get('/:slug', attachUser, (req, res) => {
  const product = requireProductBySlug(req.params.slug);
  const stats = getReviewStats(product.id);

  try {
    recordProductView(product.id, req.user?.id ?? null);
  } catch (err) {
    // Analytics must never break the page: a failed view insert is logged and dropped.
    console.error('[foldify] product view insert failed:', err);
  }

  const body: ApiResponse<ProductDetail> = {
    ok: true,
    data: {
      ...product,
      reviews: listReviewsForProduct(product.id),
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
    },
  };
  res.json(body);
});

/* ------------------------------------------------------------------ STUBS */

/**
 * POST /api/products                — admin only. requireAuth + requireAdmin, then insertProduct().
 * PATCH /api/products/:id           — admin only. Partial update.
 * DELETE /api/products/:id          — admin only. Soft delete: set is_published = 0,
 *                                     because order_items references the row.
 */

export default router;

import { Router } from 'express';
import type { ApiResponse, Paginated, Product, ProductFilters } from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import { queryInt } from '../lib/validate.ts';
import { listProducts } from '../db/queries/products.queries.ts';

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

/* ------------------------------------------------------------------ STUBS */

/**
 * GET /api/products/:slug
 * Purpose: one product for the detail page, with its reviews.
 * Use getProductBySlug(req.params.slug); null -> throw AppError.notFound().
 * Also record a row in product_views while you are here.
 */
router.get('/:slug', () => {
  throw AppError.notImplemented('GET /api/products/:slug is not built yet.');
});

/**
 * POST /api/products                — admin only. requireAuth + requireAdmin, then insertProduct().
 * PATCH /api/products/:id           — admin only. Partial update.
 * DELETE /api/products/:id          — admin only. Soft delete: set is_published = 0,
 *                                     because order_items references the row.
 * GET  /api/products/:slug/reviews  — list reviews for a product.
 * POST /api/products/:slug/reviews  — requireAuth. One review per user per product
 *                                     (the UNIQUE constraint enforces it — catch it
 *                                     and rethrow as AppError.conflict).
 */

export default router;

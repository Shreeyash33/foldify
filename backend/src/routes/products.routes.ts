import { Router } from 'express';
import type {
  ApiResponse,
  Category,
  CreateCategoryRequest,
  CreateProductRequest,
  CreateReviewRequest,
  Paginated,
  Product,
  ProductDetail,
  ProductFilters,
  Review,
  UpdateProductRequest,
} from '@foldify/shared';
import { AppError } from '../lib/errors.ts';
import {
  isInteger,
  isNonNegativeInteger,
  isSlug,
  isString,
  maxLength,
  minLength,
  oneOf,
  optional,
  queryInt,
  required,
  validateBody,
  type Rule,
} from '../lib/validate.ts';
import {
  getCategoryBySlug,
  getProductById,
  getProductBySlug,
  insertCategory,
  insertProduct,
  listAllProducts,
  listCategories,
  listLinkedTutorials,
  listProducts,
  recordProductView,
  softDeleteProduct,
  updateProduct,
} from '../db/queries/products.queries.ts';
import {
  getReviewStats,
  insertReview,
  listReviewsForProduct,
} from '../db/queries/reviews.queries.ts';
import { attachUser, requireAuth } from '../middleware/requireAuth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

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

/* The literal admin list/category paths MUST be registered before `/:slug`,
 * or the single-segment pattern would swallow "all" and "categories". */

/**
 * GET /api/products/all — every product, published or not, for the admin
 * items page. Returns unpublished rows, so it deliberately bypasses the
 * public `listProducts` filter (which hard-codes `is_published = 1`).
 */
router.get('/all', requireAuth, requireAdmin, (_req, res) => {
  const body: ApiResponse<Product[]> = { ok: true, data: listAllProducts() };
  res.json(body);
});

/** GET /api/products/categories — for the item form's category dropdown. */
router.get('/categories', requireAuth, requireAdmin, (_req, res) => {
  const body: ApiResponse<Category[]> = { ok: true, data: listCategories() };
  res.json(body);
});

/** POST /api/products/categories — admin only. Create a new category. */
router.post('/categories', requireAuth, requireAdmin, (req, res) => {
  const body = validateBody<CreateCategoryRequest>(req.body, {
    slug: [required, isSlug, maxLength(60)],
    name: [required, minLength(2), maxLength(100)],
    description: [optional(isString), maxLength(300)],
  });

  if (getCategoryBySlug(body.slug) !== null) {
    throw AppError.conflict(`A category with the slug "${body.slug}" already exists.`);
  }

  const created = insertCategory({
    slug: body.slug.trim(),
    name: body.name.trim(),
    description:
      body.description == null || body.description.trim() === '' ? null : body.description.trim(),
  });

  const response: ApiResponse<Category> = { ok: true, data: created };
  res.status(201).json(response);
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
      linkedTutorials: listLinkedTutorials(product.id),
    },
  };
  res.json(body);
});

/* ------------------------------------------------------------------ ADMIN */

/**
 * POST /api/products — admin only. Creates a product from validated input.
 * `priceMinor` arrives in paisa; the rupees→paisa conversion happens in the
 * form, not here, so the API only ever speaks minor units.
 */
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const body = validateBody<CreateProductRequest>(req.body, {
    slug: [required, isSlug, maxLength(120)],
    name: [required, minLength(2), maxLength(120)],
    description: [required, maxLength(2000)],
    priceMinor: [required, isNonNegativeInteger],
    imageUrl: [optional(isString), maxLength(500)],
    categoryId: [required, isInteger],
    stock: [required, isNonNegativeInteger],
    difficulty: [required, oneOf(DIFFICULTIES)],
  });

  const existing = getProductBySlug(body.slug);
  if (existing !== null) throw AppError.conflict(`A product with the slug "${body.slug}" already exists.`);

  const created = insertProduct({
    slug: body.slug.trim(),
    name: body.name.trim(),
    description: body.description.trim(),
    priceMinor: body.priceMinor,
    imageUrl: body.imageUrl === undefined ? null : body.imageUrl ?? null,
    categoryId: body.categoryId,
    stock: body.stock,
    difficulty: body.difficulty,
  });

  const response: ApiResponse<Product> = { ok: true, data: created };
  res.status(201).json(response);
});

/** Loads the product named in the URL by id, for the admin endpoints below. */
function requireProductById(idRaw: string | undefined): Product {
  const id = Number.parseInt(idRaw ?? '', 10);
  const product = Number.isNaN(id) ? null : getProductById(id);
  if (product === null) throw AppError.notFound('No such product.');
  return product;
}

/**
 * PATCH /api/products/:id — admin only. Partial update; every field is
 * optional and only supplied fields are written.
 */
router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
  const product = requireProductById(req.params.id);
  const body = validateBody<UpdateProductRequest>(req.body, {
    slug: [optional(isSlug), maxLength(120)],
    name: [optional(minLength(2)), maxLength(120)],
    description: [optional(isString), maxLength(2000)],
    priceMinor: [optional(isNonNegativeInteger)],
    imageUrl: [optional(isString), maxLength(500)],
    categoryId: [optional(isInteger)],
    stock: [optional(isNonNegativeInteger)],
    difficulty: [optional(oneOf(DIFFICULTIES))],
    isPublished: [optional(isProductPublishFlag)],
  });

  if (body.slug !== undefined) {
    const conflict = getProductBySlug(body.slug);
    if (conflict !== null && conflict.id !== product.id) {
      throw AppError.conflict(`A product with the slug "${body.slug}" already exists.`);
    }
  }

  const updated = updateProduct(product.id, body);
  if (updated === null) throw AppError.notFound('No such product.');

  const response: ApiResponse<Product> = { ok: true, data: updated };
  res.json(response);
});

/**
 * DELETE /api/products/:id — admin only. Soft delete (unpublish): the row
 * must survive because order_items holds a foreign key to it.
 */
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const product = requireProductById(req.params.id);
  softDeleteProduct(product.id);

  const response: ApiResponse<{ deleted: true }> = { ok: true, data: { deleted: true } };
  res.json(response);
});

/** A 0/1 x-www-form boolean is silently dropped as text; accept both. */
function isProductPublishFlag(value: unknown, field: string): string | null {
  return value === true || value === false || value === 0 || value === 1
    ? null
    : `${field} must be true or false.`;
}

export default router;


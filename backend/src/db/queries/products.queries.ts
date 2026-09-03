import type { Category, LinkedTutorial, Product, ProductFilters, Paginated } from '@foldify/shared';
import { db } from '../index.ts';

/**
 * THIS FILE IS THE PATTERN TO COPY.
 *
 * Rules for every file in db/queries/:
 *   1. SQL only. No Express types, no `req`, no `res`, no business rules.
 *   2. Parameterised queries ONLY. Never build SQL by string interpolation —
 *      `WHERE name = '${input}'` is how the whole database walks out the door.
 *   3. Return the shared types from @foldify/shared, mapped from snake_case
 *      columns to camelCase fields right here, so no caller ever sees a raw row.
 */

/** The raw shape of the categories table. */
interface CategoryData {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

/** The raw shape SQLite hands back — snake_case, integers for booleans. */
interface ProductRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  price_minor: number;
  compare_at_price_minor: number | null;
  currency: 'NPR';
  image_url: string | null;
  category_id: number;
  category_name: string | null;
  stock: number;
  difficulty: Product['difficulty'];
  is_published: number;
  created_at: string;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceMinor: row.price_minor,
    compareAtPriceMinor: row.compare_at_price_minor,
    currency: row.currency,
    imageUrl: row.image_url,
    categoryId: row.category_id,
    ...(row.category_name !== null ? { categoryName: row.category_name } : {}),
    stock: row.stock,
    difficulty: row.difficulty,
    isPublished: row.is_published === 1,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_CATEGORY = `
  SELECT p.id, p.slug, p.name, p.description, p.price_minor, p.compare_at_price_minor,
         p.currency, p.image_url, p.category_id, c.name AS category_name,
         p.stock, p.difficulty, p.is_published, p.created_at
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

/**
 * List with filters and pagination.
 *
 * The WHERE clause is assembled from fixed fragments and the *values* are bound
 * as parameters — the shape of the query varies, the data never touches the SQL
 * string.
 */
export function listProducts(filters: ProductFilters = {}): Paginated<Product> {
  const page = Math.max(filters.page ?? 1, 1);
  const perPage = Math.min(Math.max(filters.perPage ?? 12, 1), 60);

  const where: string[] = ['p.is_published = 1'];
  const params: Record<string, string | number> = {};

  if (filters.categorySlug !== undefined) {
    where.push('c.slug = @categorySlug');
    params.categorySlug = filters.categorySlug;
  }
  if (filters.difficulty !== undefined) {
    where.push('p.difficulty = @difficulty');
    params.difficulty = filters.difficulty;
  }
  if (filters.search !== undefined && filters.search.trim() !== '') {
    where.push('(p.name LIKE @search OR p.description LIKE @search)');
    params.search = `%${filters.search.trim()}%`;
  }
  if (filters.minPriceMinor !== undefined) {
    where.push('p.price_minor >= @minPriceMinor');
    params.minPriceMinor = filters.minPriceMinor;
  }
  if (filters.maxPriceMinor !== undefined) {
    where.push('p.price_minor <= @maxPriceMinor');
    params.maxPriceMinor = filters.maxPriceMinor;
  }

  // Whitelisted, never interpolated from user input.
  const orderBy = {
    newest: 'p.created_at DESC',
    'price-asc': 'p.price_minor ASC',
    'price-desc': 'p.price_minor DESC',
    name: 'p.name ASC',
  }[filters.sort ?? 'newest'];

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const total = (
    db
      .prepare(`SELECT COUNT(*) AS count FROM products p JOIN categories c ON c.id = p.category_id ${whereSql}`)
      .get(params) as { count: number }
  ).count;

  const rows = db
    .prepare(`${SELECT_WITH_CATEGORY} ${whereSql} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: perPage, offset: (page - 1) * perPage }) as ProductRow[];

  return {
    items: rows.map(mapProduct),
    page,
    perPage,
    total,
    totalPages: Math.max(Math.ceil(total / perPage), 1),
  };
}

/** Single-row get by slug. Returns null rather than throwing — HTTP concerns belong to routes/. */
export function getProductBySlug(slug: string): Product | null {
  const row = db.prepare(`${SELECT_WITH_CATEGORY} WHERE p.slug = ?`).get(slug) as ProductRow | undefined;
  return row === undefined ? null : mapProduct(row);
}

export function getProductById(id: number): Product | null {
  const row = db.prepare(`${SELECT_WITH_CATEGORY} WHERE p.id = ?`).get(id) as ProductRow | undefined;
  return row === undefined ? null : mapProduct(row);
}

/**
 * The tutorials that teach this product's fold, via the tutorial_product_links
 * join table. Only published tutorials — a link to an unpublished tutorial
 * would point at a 404 page.
 */
export function listLinkedTutorials(productId: number): LinkedTutorial[] {
  const rows = db
    .prepare(
      `SELECT t.slug, t.title
       FROM tutorial_product_links l
       JOIN tutorials t ON t.id = l.tutorial_id
       WHERE l.product_id = ? AND t.is_published = 1
       ORDER BY t.created_at ASC`,
    )
    .all(productId) as { slug: string; title: string }[];

  return rows.map((row) => ({ slug: row.slug, title: row.title }));
}

export interface NewProduct {
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  compareAtPriceMinor?: number | null;
  imageUrl: string | null;
  categoryId: number;
  stock: number;
  difficulty: Product['difficulty'];
}

/** Insert, returning the created row. */
export function insertProduct(input: NewProduct): Product {
  const result = db
    .prepare(
      `INSERT INTO products
         (slug, name, description, price_minor, compare_at_price_minor, image_url, category_id, stock, difficulty)
       VALUES
         (@slug, @name, @description, @priceMinor, @compareAtPriceMinor, @imageUrl, @categoryId, @stock, @difficulty)`,
    )
    .run(input);

  const created = getProductById(Number(result.lastInsertRowid));
  if (created === null) throw new Error('Product insert succeeded but the row could not be read back.');
  return created;
}

/** Idempotent insert used by the seed script. */
export function upsertProductBySlug(input: NewProduct): void {
  db.prepare(
    `INSERT INTO products
       (slug, name, description, price_minor, compare_at_price_minor, image_url, category_id, stock, difficulty)
     VALUES
       (@slug, @name, @description, @priceMinor, @compareAtPriceMinor, @imageUrl, @categoryId, @stock, @difficulty)
     ON CONFLICT (slug) DO UPDATE SET
       name                  = excluded.name,
       description           = excluded.description,
       price_minor           = excluded.price_minor,
       compare_at_price_minor = excluded.compare_at_price_minor,
       image_url             = excluded.image_url,
       category_id           = excluded.category_id,
       stock                 = excluded.stock,
       difficulty            = excluded.difficulty`,
  ).run(input);
}

/** A join across three tables: products with their average review score. */
export function listProductsWithRatings(limit = 12): (Product & { averageRating: number; reviewCount: number })[] {
  const rows = db
    .prepare(
      `SELECT p.id, p.slug, p.name, p.description, p.price_minor, p.compare_at_price_minor,
              p.currency, p.image_url, p.category_id, c.name AS category_name,
              p.stock, p.difficulty, p.is_published, p.created_at,
              COALESCE(AVG(r.rating), 0) AS average_rating,
              COUNT(r.id) AS review_count
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r ON r.product_id = p.id
       WHERE p.is_published = 1
       GROUP BY p.id
       ORDER BY average_rating DESC, p.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as (ProductRow & { average_rating: number; review_count: number })[];

  return rows.map((row) => ({
    ...mapProduct(row),
    averageRating: Number(row.average_rating.toFixed(2)),
    reviewCount: row.review_count,
  }));
}

/** Analytics write. `userId` is null for anonymous visitors — the column is nullable. */
export function recordProductView(productId: number, userId: number | null): void {
  db.prepare(`INSERT INTO product_views (product_id, user_id) VALUES (?, ?)`).run(productId, userId);
}

/* ---------------------------------------------------------------- admin */

/**
 * Every product, published or not, newest first, for the admin items page.
 * The public list filters to published; an admin must see drafts and
 * soft-deleted rows so they can be edited or republished.
 */
export function listAllProducts(): Product[] {
  const rows = db
    .prepare(`${SELECT_WITH_CATEGORY} ORDER BY p.created_at DESC, p.id DESC`)
    .all() as ProductRow[];
  return rows.map(mapProduct);
}

/**
 * Partial update. Only the supplied fields are set; `undefined` is left alone.
 * Returns the updated row, or null when the product does not exist.
 */
export function updateProduct(id: number, input: Partial<NewProduct> & { isPublished?: boolean }): Product | null {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (input.slug !== undefined) { fields.push('slug = @slug'); params.slug = input.slug; }
  if (input.name !== undefined) { fields.push('name = @name'); params.name = input.name; }
  if (input.description !== undefined) { fields.push('description = @description'); params.description = input.description; }
  if (input.priceMinor !== undefined) { fields.push('price_minor = @priceMinor'); params.priceMinor = input.priceMinor; }
  if (input.compareAtPriceMinor !== undefined) { fields.push('compare_at_price_minor = @compareAtPriceMinor'); params.compareAtPriceMinor = input.compareAtPriceMinor; }
  if (input.imageUrl !== undefined) { fields.push('image_url = @imageUrl'); params.imageUrl = input.imageUrl; }
  if (input.categoryId !== undefined) { fields.push('category_id = @categoryId'); params.categoryId = input.categoryId; }
  if (input.stock !== undefined) { fields.push('stock = @stock'); params.stock = input.stock; }
  if (input.difficulty !== undefined) { fields.push('difficulty = @difficulty'); params.difficulty = input.difficulty; }
  if (input.isPublished !== undefined) { fields.push('is_published = @isPublished'); params.isPublished = input.isPublished ? 1 : 0; }

  if (fields.length === 0) return getProductById(id);
  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getProductById(id);
}

/**
 * Soft delete: unpublish rather than remove the row, because order_items
 * holds a foreign key to products. A deleted product still appears in the
 * admin list (filtered to the bottom) so it can be brought back.
 */
export function softDeleteProduct(id: number): void {
  db.prepare('UPDATE products SET is_published = 0 WHERE id = ?').run(id);
}

/** A category by slug, or null. Used to reject duplicate slugs on create. */
export function getCategoryBySlug(slug: string): CategoryData | null {
  return (db.prepare('SELECT id, slug, name, description FROM categories WHERE slug = ?').get(slug) as
    | CategoryData
    | undefined) ?? null;
}

/**
 * Insert a new category and return the persisted row. The caller checks for a
 * duplicate slug first; a UNIQUE constraint backstop keeps this honest.
 */
export function insertCategory(input: { slug: string; name: string; description: string | null }): CategoryData {
  db.prepare('INSERT INTO categories (slug, name, description) VALUES (@slug, @name, @description)').run(
    { slug: input.slug, name: input.name, description: input.description },
  );
  return getCategoryBySlug(input.slug) as CategoryData;
}

/** All categories, ordered by name, for the item form's category dropdown. */
export function listCategories(): Category[] {
  const rows = db
    .prepare('SELECT id, slug, name, description FROM categories ORDER BY name ASC')
    .all() as CategoryData[];
  return rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, description: row.description }));
}

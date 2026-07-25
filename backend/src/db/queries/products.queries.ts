import type { Product, ProductFilters, Paginated } from '@foldify/shared';
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

/** The raw shape SQLite hands back — snake_case, integers for booleans. */
interface ProductRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  price_minor: number;
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
  SELECT p.id, p.slug, p.name, p.description, p.price_minor, p.currency,
         p.image_url, p.category_id, c.name AS category_name,
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

export interface NewProduct {
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
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
         (slug, name, description, price_minor, image_url, category_id, stock, difficulty)
       VALUES
         (@slug, @name, @description, @priceMinor, @imageUrl, @categoryId, @stock, @difficulty)`,
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
       (slug, name, description, price_minor, image_url, category_id, stock, difficulty)
     VALUES
       (@slug, @name, @description, @priceMinor, @imageUrl, @categoryId, @stock, @difficulty)
     ON CONFLICT (slug) DO UPDATE SET
       name         = excluded.name,
       description  = excluded.description,
       price_minor  = excluded.price_minor,
       image_url    = excluded.image_url,
       category_id  = excluded.category_id,
       stock        = excluded.stock,
       difficulty   = excluded.difficulty`,
  ).run(input);
}

/** A join across three tables: products with their average review score. */
export function listProductsWithRatings(limit = 12): (Product & { averageRating: number; reviewCount: number })[] {
  const rows = db
    .prepare(
      `SELECT p.id, p.slug, p.name, p.description, p.price_minor, p.currency,
              p.image_url, p.category_id, c.name AS category_name,
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

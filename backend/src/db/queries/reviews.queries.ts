import type { Review } from '@foldify/shared';
import { db } from '../index.ts';

/**
 * SQL only — see db/queries/products.queries.ts for the pattern this file follows.
 */

/** The raw shape SQLite hands back — snake_case, with the author joined in. */
interface ReviewRow {
  id: number;
  product_id: number;
  user_id: number;
  author_name: string | null;
  rating: Review['rating'];
  body: string;
  created_at: string;
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    ...(row.author_name !== null ? { authorName: row.author_name } : {}),
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_AUTHOR = `
  SELECT r.id, r.product_id, r.user_id, u.name AS author_name,
         r.rating, r.body, r.created_at
  FROM reviews r
  JOIN users u ON u.id = r.user_id
`;

/** Newest first — the detail page shows the most recent opinion at the top. */
export function listReviewsForProduct(productId: number): Review[] {
  const rows = db
    .prepare(`${SELECT_WITH_AUTHOR} WHERE r.product_id = ? ORDER BY r.created_at DESC, r.id DESC`)
    .all(productId) as ReviewRow[];

  return rows.map(mapReview);
}

export function getReviewById(id: number): Review | null {
  const row = db.prepare(`${SELECT_WITH_AUTHOR} WHERE r.id = ?`).get(id) as ReviewRow | undefined;
  return row === undefined ? null : mapReview(row);
}

export interface NewReview {
  productId: number;
  userId: number;
  rating: number;
  body: string;
}

/**
 * Insert, returning the created row.
 *
 * The UNIQUE (product_id, user_id) constraint surfaces here as a better-sqlite3
 * error with `code === 'SQLITE_CONSTRAINT_UNIQUE'`; translating that to an HTTP
 * status is the route's job, not this layer's.
 */
export function insertReview(input: NewReview): Review {
  const result = db
    .prepare(
      `INSERT INTO reviews (product_id, user_id, rating, body)
       VALUES (@productId, @userId, @rating, @body)`,
    )
    .run(input);

  const created = getReviewById(Number(result.lastInsertRowid));
  if (created === null) throw new Error('Review insert succeeded but the row could not be read back.');
  return created;
}

export interface ReviewStats {
  averageRating: number;
  reviewCount: number;
}

export function getReviewStats(productId: number): ReviewStats {
  const row = db
    .prepare(
      `SELECT COALESCE(AVG(rating), 0) AS average_rating, COUNT(id) AS review_count
       FROM reviews
       WHERE product_id = ?`,
    )
    .get(productId) as { average_rating: number; review_count: number };

  return {
    averageRating: Number(row.average_rating.toFixed(2)),
    reviewCount: row.review_count,
  };
}

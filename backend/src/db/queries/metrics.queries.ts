import type { AdminOverview } from '@foldify/shared';
import { db } from '../index.ts';

/**
 * SQL only — see products.queries.ts for the rules.
 *
 * Aggregates for the admin Overview page. Everything here is a plain COUNT
 * over one table (or a JOIN for a slightly richer number like published
 * products) — deliberately no analytics over product_views / tutorial_views
 * yet, per the admin overview notes: counts in cards, no charts in v1.
 */

function count(table: string, where = ''): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM ${table} ${where}`)
    .get() as { count: number };
  return row.count;
}

export function getOverviewCounts(): AdminOverview {
  return {
    users: count('users'),
    products: count('products'),
    publishedProducts: count('products', 'WHERE is_published = 1'),
    tutorials: count('tutorials'),
    publishedTutorials: count('tutorials', 'WHERE is_published = 1'),
    orders: count('orders'),
    ordersPending: count('orders', "WHERE status = 'pending'"),
    contactUnhandled: count('contact_messages', 'WHERE is_handled = 0'),
    categories: count('categories'),
    reviews: count('reviews'),
  };
}

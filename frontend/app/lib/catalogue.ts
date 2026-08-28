import { cacheLife, cacheTag } from 'next/cache';
import type { Paginated, Product, ProductDetail, ProductFilters, Tutorial } from '@foldify/shared';
import * as api from './api-client';

/**
 * Cached reads of the catalogue, for server components only.
 *
 * Paper, kits and tutorials change a few times a term, not a few times a
 * minute, so these are the parts of the site that should not be rebuilt per
 * visitor. Anything that varies per person — a price shown next to a
 * personalised offer, stock at the moment of viewing, an order — must NOT come
 * through here: a `'use cache'` result is shared by every viewer.
 *
 * The `revalidate` passed down to the api-client matters as much as the
 * directive: without it the client sends `cache: 'no-store'`, which
 * `cacheComponents` rejects inside a cached function.
 */

const CATALOGUE_TTL_SECONDS = 3600;

export async function getProductPage(filters: ProductFilters): Promise<Paginated<Product>> {
  'use cache';
  cacheLife('hours');
  cacheTag('products');

  return api.listProducts(filters, { revalidate: CATALOGUE_TTL_SECONDS, tags: ['products'] });
}

/**
 * The parts of a product that belong in the static shell — name, description,
 * imagery. Price and stock are read separately and uncached, because a shell
 * cached for an hour must not be the thing that tells someone what to pay.
 */
export async function getProductShell(slug: string): Promise<ProductDetail> {
  'use cache';
  cacheLife('hours');
  cacheTag('products', `product:${slug}`);

  return api.getProduct(slug, { revalidate: CATALOGUE_TTL_SECONDS, tags: ['products'] });
}

export async function getTutorialList(): Promise<Tutorial[]> {
  'use cache';
  cacheLife('hours');
  cacheTag('tutorials');

  return api.listTutorials({ revalidate: CATALOGUE_TTL_SECONDS, tags: ['tutorials'] });
}

export async function getTutorialDetail(slug: string): Promise<Tutorial> {
  'use cache';
  cacheLife('hours');
  cacheTag('tutorials', `tutorial:${slug}`);

  return api.getTutorial(slug, { revalidate: CATALOGUE_TTL_SECONDS, tags: ['tutorials'] });
}

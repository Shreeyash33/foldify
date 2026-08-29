import type { Difficulty, ProductFilters } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { getProductPage } from '@/app/lib/catalogue';
import { ApiClientError } from '@/app/lib/api-client';
import { ProductCard } from './ProductCard';

const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const SORTS: readonly NonNullable<ProductFilters['sort']>[] = [
  'newest',
  'price-asc',
  'price-desc',
  'name',
];

export type ProductSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Only values the API understands survive; anything else is dropped, not passed on. */
function toFilters(params: ProductSearchParams): ProductFilters {
  const filters: ProductFilters = { perPage: 12 };

  const category = single(params.category);
  if (category !== undefined && category !== '') filters.categorySlug = category;

  const search = single(params.search);
  if (search !== undefined && search !== '') filters.search = search;

  const difficulty = single(params.difficulty);
  if (DIFFICULTIES.includes(difficulty as Difficulty)) filters.difficulty = difficulty as Difficulty;

  const sort = single(params.sort);
  if (SORTS.includes(sort as NonNullable<ProductFilters['sort']>)) {
    filters.sort = sort as NonNullable<ProductFilters['sort']>;
  }

  const page = Number.parseInt(single(params.page) ?? '1', 10);
  filters.page = Number.isNaN(page) || page < 1 ? 1 : page;

  return filters;
}

function buildHref(params: ProductSearchParams, page: number): string {
  const query = new URLSearchParams();

  for (const key of ['category', 'search', 'difficulty', 'sort']) {
    const value = single(params[key]);
    if (value !== undefined && value !== '') query.set(key, value);
  }
  if (page > 1) query.set('page', String(page));

  const suffix = query.toString();
  return suffix === '' ? '/products' : `/products?${suffix}`;
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={index}>
          <Skeleton shape="block" />
          <CardBody className="flex flex-col gap-2">
            <Skeleton shape="title" />
            <Skeleton shape="text" lines={2} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export async function ProductGrid({ searchParams }: { searchParams: Promise<ProductSearchParams> }) {
  const params = await searchParams;

  let page;
  try {
    page = await getProductPage(toFilters(params));
  } catch (error) {
    const message =
      error instanceof ApiClientError && error.isNetworkFailure
        ? 'The shop is not reachable right now. Start the API and reload.'
        : 'The shop could not be loaded. Please try again shortly.';

    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>{message}</p>
          <Button href="/products" variant="secondary" size="sm">
            Try again
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (page.items.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <p>Nothing matches those filters yet.</p>
          <Button href="/products" variant="secondary" size="sm">
            Clear filters
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {page.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {page.totalPages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
          {page.page > 1 ? (
            <Button href={buildHref(params, page.page - 1)} variant="secondary" size="sm">
              Previous
            </Button>
          ) : (
            <span />
          )}

          <Badge tone="neutral">
            Page {page.page} of {page.totalPages}
          </Badge>

          {page.page < page.totalPages ? (
            <Button href={buildHref(params, page.page + 1)} variant="secondary" size="sm">
              Next
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

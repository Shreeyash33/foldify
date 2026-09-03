import type {
  AdminOrder,
  AdminOverview,
  AdminUser,
  ApiError,
  ApiResponse,
  AppendTutorialStepRequest,
  AuthResponse,
  Category,
  ContactMessage,
  ContactRequest,
  CraftFile,
  CraftFileVersion,
  CreateCategoryRequest,
  CreateOrderRequest,
  CreateOrderResponse,
  CreateProductRequest,
  CreateReviewRequest,
  CreateTutorialRequest,
  LoginRequest,
  Order,
  OrderStatus,
  Paginated,
  Product,
  ProductDetail,
  ProductFilters,
  RegisterRequest,
  Review,
  Role,
  SaveCraftFileRequest,
  StatusResponse,
  Tutorial,
  TutorialStep,
  UpdateProductRequest,
  UpdateTutorialRequest,
  User,
} from '@foldify/shared';
import { mockProducts, mockStatus, mockTutorials, mockUser } from './mock-data';

/**
 * THE ONLY PLACE `fetch` IS CALLED.
 *
 * No component, page, or context may call fetch directly. Everything goes
 * through a typed function here, so there is exactly one place that knows the
 * base URL, the credentials mode, the error shape, and the mock switch.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * With this on, every function below returns lib/mock-data.ts and the backend
 * is never contacted — the whole frontend renders with the API stopped, so
 * page work never blocks on an endpoint someone else has not written yet.
 *
 * Defaults to OFF, because `npm run dev` starts both apps. Turn it on in
 * frontend/.env.local when you want to work with the backend stopped:
 *
 *   NEXT_PUBLIC_USE_MOCK=true
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/** Thrown by every failed request. Carries the backend's typed error shape. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = error.code;
    this.fields = error.fields;
  }

  /** True when the backend simply is not running — worth a friendlier message. */
  get isNetworkFailure(): boolean {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Appended as a query string; undefined values are dropped. */
  query?: Record<string, string | number | undefined>;
  /**
   * Seconds to cache this response for on the server, enabling the static
   * shell for catalogue routes. Omit it for anything per-request.
   *
   * A cached response is shared by every visitor, so a call that sets this
   * MUST NOT depend on who is asking — the session cookie is deliberately not
   * forwarded on these, and `cacheComponents` would reject reading it anyway.
   */
  revalidate?: number;
  /** Cache tags for targeted revalidation. Only meaningful alongside `revalidate`. */
  tags?: string[];
}

/**
 * The session cookie rides on the browser's own request, but a server render
 * has no browser attached, so it is forwarded explicitly. Returns undefined
 * outside a request scope — during a static prerender there is no cookie to
 * read, which is exactly when there must not be one.
 */
async function serverCookieHeader(): Promise<string | undefined> {
  if (typeof window !== 'undefined') return undefined;

  try {
    const { cookies } = await import('next/headers');
    const header = (await cookies()).toString();
    return header === '' ? undefined : header;
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`/api${path}`, BASE_URL);

  if (options.query !== undefined) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const isCached = options.revalidate !== undefined;

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  if (!isCached) {
    const cookie = await serverCookieHeader();
    if (cookie !== undefined) headers.cookie = cookie;
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: Object.keys(headers).length === 0 ? undefined : headers,
      // Cookie sessions, not tokens. The backend sets an httpOnly cookie and
      // its CORS config names this exact origin — a wildcard origin plus
      // credentials is silently rejected by the browser.
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      ...(isCached
        ? { next: { revalidate: options.revalidate, tags: options.tags } }
        : { cache: 'no-store' as const }),
    });
  } catch {
    throw new ApiClientError(0, {
      code: 'NETWORK_ERROR',
      message: `Could not reach the API at ${BASE_URL}. Is the backend running? (npm run dev:backend)`,
    });
  }

  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(response.status, {
      code: 'BAD_RESPONSE',
      message: 'The API returned something that was not JSON.',
    });
  }

  if (!payload.ok) throw new ApiClientError(response.status, payload.error);

  return payload.data;
}

/**
 * Passed by server components that render inside a `'use cache'` boundary.
 * Client callers leave it off and get uncached, per-request data.
 */
export interface CacheOptions {
  revalidate?: number;
  tags?: string[];
}

/* ================================================================= status */

export async function getStatus(): Promise<StatusResponse> {
  if (USE_MOCK) return mockStatus();
  return request<StatusResponse>('/status');
}

/* =================================================================== auth */

export async function getCurrentUser(): Promise<User | null> {
  if (USE_MOCK) return null; // mock mode starts signed out; sign in to see the rest
  const data = await request<{ user: User | null }>('/auth/me');
  return data.user;
}

export async function login(input: LoginRequest): Promise<User> {
  if (USE_MOCK) return { ...mockUser, email: input.email };
  const data = await request<AuthResponse>('/auth/login', { method: 'POST', body: input });
  return data.user;
}

export async function register(input: RegisterRequest): Promise<User> {
  if (USE_MOCK) return { ...mockUser, email: input.email, name: input.name, role: 'customer' };
  const data = await request<AuthResponse>('/auth/register', { method: 'POST', body: input });
  return data.user;
}

export async function logout(): Promise<void> {
  if (USE_MOCK) return;
  await request<{ ok: true }>('/auth/logout', { method: 'POST' });
}

/* =============================================================== products */

export async function listProducts(
  filters: ProductFilters = {},
  cache: CacheOptions = {},
): Promise<Paginated<Product>> {
  if (USE_MOCK) {
    const perPage = filters.perPage ?? 12;
    const page = filters.page ?? 1;
    const filtered = mockProducts.filter(
      (product) => filters.difficulty === undefined || product.difficulty === filters.difficulty,
    );
    return {
      items: filtered.slice((page - 1) * perPage, page * perPage),
      page,
      perPage,
      total: filtered.length,
      totalPages: Math.max(Math.ceil(filtered.length / perPage), 1),
    };
  }

  return request<Paginated<Product>>('/products', {
    ...cache,
    query: {
      category: filters.categorySlug,
      difficulty: filters.difficulty,
      search: filters.search,
      sort: filters.sort,
      page: filters.page,
      perPage: filters.perPage,
    },
  });
}

export async function getProduct(slug: string, cache: CacheOptions = {}): Promise<ProductDetail> {
  if (USE_MOCK) {
    const found = mockProducts.find((product) => product.slug === slug);
    if (found === undefined) {
      throw new ApiClientError(404, { code: 'NOT_FOUND', message: 'No such product.' });
    }
    return { ...found, reviews: [], averageRating: 0, reviewCount: 0, linkedTutorials: [] };
  }
  return request<ProductDetail>(`/products/${encodeURIComponent(slug)}`, cache);
}

/* ============================================================== tutorials */

export async function listTutorials(cache: CacheOptions = {}): Promise<Tutorial[]> {
  if (USE_MOCK) return mockTutorials;
  return request<Tutorial[]>('/tutorials', cache);
}

export async function getTutorial(slug: string, cache: CacheOptions = {}): Promise<Tutorial> {
  if (USE_MOCK) {
    const found = mockTutorials.find((tutorial) => tutorial.slug === slug);
    if (found === undefined) {
      throw new ApiClientError(404, { code: 'NOT_FOUND', message: 'No such tutorial.' });
    }
    return found;
  }
  return request<Tutorial>(`/tutorials/${encodeURIComponent(slug)}`, cache);
}

/* ================================================================ reviews */

export async function listReviews(slug: string, cache: CacheOptions = {}): Promise<Review[]> {
  if (USE_MOCK) return [];
  return request<Review[]>(`/products/${encodeURIComponent(slug)}/reviews`, cache);
}

export async function createReview(slug: string, input: CreateReviewRequest): Promise<Review> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Reviews need the API.' });
  return request<Review>(`/products/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    body: input,
  });
}

/* ================================================================= orders */

/**
 * The cart sends product ids and quantities only. The server recomputes every
 * price and the total from its own products table, so nothing here needs to —
 * and nothing here should be trusted to.
 */
export async function createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Checkout needs the API.' });
  return request<CreateOrderResponse>('/orders', { method: 'POST', body: input });
}

export async function listOrders(): Promise<Order[]> {
  if (USE_MOCK) return [];
  return request<Order[]>('/orders');
}

export async function verifyOrderPayment(id: number): Promise<Order> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Payment needs the API.' });
  return request<Order>(`/orders/${id}/verify`, { method: 'POST' });
}

/* ================================================================ contact */

export async function sendContactMessage(input: ContactRequest): Promise<void> {
  if (USE_MOCK) return;
  await request<{ received: true }>('/contact', { method: 'POST', body: input });
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  if (USE_MOCK) return [];
  return request<ContactMessage[]>('/contact');
}

export async function setContactHandled(id: number, isHandled: boolean): Promise<ContactMessage> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'The inbox needs the API.' });
  return request<ContactMessage>(`/contact/${id}`, { method: 'PATCH', body: { isHandled } });
}

/* ================================================================== admin */

/**
 * Everything below is admin-only. The backend enforces `requireAdmin` on every
 * route; these functions simply fail with the 403 if the session is not an
 * admin, which the pages render as an access-denied state.
 */

export async function getAdminOverview(): Promise<AdminOverview> {
  if (USE_MOCK)
    return {
      users: 2,
      products: mockProducts.length,
      publishedProducts: mockProducts.length,
      tutorials: mockTutorials.length,
      publishedTutorials: mockTutorials.length,
      orders: 0,
      ordersPending: 0,
      contactUnhandled: 0,
      categories: 4,
      reviews: 0,
    };
  return request<AdminOverview>('/admin/overview');
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  if (USE_MOCK) return [{ ...mockUser, orderCount: 0, totalSpentMinor: 0 }];
  return request<AdminUser[]>('/users');
}

export async function updateUserRole(id: number, role: Role): Promise<User> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Role changes need the API.' });
  return request<User>(`/users/${id}/role`, { method: 'PATCH', body: { role } });
}

export async function listAdminProducts(): Promise<Product[]> {
  if (USE_MOCK) return mockProducts;
  return request<Product[]>('/products/all');
}

export async function listCategories(): Promise<Category[]> {
  if (USE_MOCK) return [];
  return request<Category[]>('/products/categories');
}

export async function createCategory(input: CreateCategoryRequest): Promise<Category> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Create needs the API.' });
  return request<Category>('/products/categories', { method: 'POST', body: input });
}

export async function createProduct(input: CreateProductRequest): Promise<Product> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Create needs the API.' });
  return request<Product>('/products', { method: 'POST', body: input });
}

export async function updateProduct(id: number, input: UpdateProductRequest): Promise<Product> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Update needs the API.' });
  return request<Product>(`/products/${id}`, { method: 'PATCH', body: input });
}

export async function deleteProduct(id: number): Promise<void> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Delete needs the API.' });
  await request<{ deleted: true }>(`/products/${id}`, { method: 'DELETE' });
}

export async function listAdminTutorials(): Promise<Tutorial[]> {
  if (USE_MOCK) return mockTutorials;
  return request<Tutorial[]>('/tutorials/all');
}

export async function createTutorial(input: CreateTutorialRequest): Promise<Tutorial> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Create needs the API.' });
  return request<Tutorial>('/tutorials', { method: 'POST', body: input });
}

export async function updateTutorial(id: number, input: UpdateTutorialRequest): Promise<Tutorial> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Update needs the API.' });
  return request<Tutorial>(`/tutorials/${id}`, { method: 'PATCH', body: input });
}

export async function deleteTutorial(id: number): Promise<void> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Delete needs the API.' });
  await request<{ deleted: true }>(`/tutorials/${id}`, { method: 'DELETE' });
}

export async function appendTutorialStep(
  id: number,
  input: AppendTutorialStepRequest,
): Promise<TutorialStep> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Steps need the API.' });
  return request<TutorialStep>(`/tutorials/${id}/steps`, {
    method: 'POST',
    body: input,
  });
}

export async function listAdminOrders(): Promise<AdminOrder[]> {
  if (USE_MOCK) return [];
  return request<AdminOrder[]>('/orders/all');
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Status changes need the API.' });
  return request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status } });
}

/* ============================================================ craft files */

/**
 * Craft Maker authoring endpoints — admin only, and never cached: the editor
 * reads a fold back straight after saving it. The fold a reader sees is not
 * fetched here at all, it rides along on getTutorial().
 */

export async function listCraftFiles(): Promise<CraftFile[]> {
  if (USE_MOCK) return [];
  return request<CraftFile[]>('/craft-files');
}

export async function getCraftFile(id: string): Promise<CraftFile> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'The Craft Maker needs the API.' });
  return request<CraftFile>(`/craft-files/${id}`);
}

export async function createCraftFile(input: SaveCraftFileRequest): Promise<CraftFile> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Create needs the API.' });
  return request<CraftFile>('/craft-files', { method: 'POST', body: input });
}

export async function updateCraftFile(id: string, input: SaveCraftFileRequest): Promise<CraftFile> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Update needs the API.' });
  return request<CraftFile>(`/craft-files/${id}`, { method: 'PATCH', body: input });
}

export async function deleteCraftFile(id: string): Promise<void> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Delete needs the API.' });
  await request<{ deleted: true }>(`/craft-files/${id}`, { method: 'DELETE' });
}

export async function listCraftFileVersions(id: string): Promise<CraftFileVersion[]> {
  if (USE_MOCK) return [];
  return request<CraftFileVersion[]>(`/craft-files/${id}/versions`);
}

export async function restoreCraftFileVersion(id: string, revision: number): Promise<CraftFile> {
  if (USE_MOCK) throw new ApiClientError(501, { code: 'MOCK', message: 'Restore needs the API.' });
  return request<CraftFile>(`/craft-files/${id}/versions/${revision}/restore`, { method: 'POST' });
}

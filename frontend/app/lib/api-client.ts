import type {
  ApiError,
  ApiResponse,
  AuthResponse,
  ContactRequest,
  LoginRequest,
  Paginated,
  Product,
  ProductFilters,
  RegisterRequest,
  StatusResponse,
  Tutorial,
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
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`/api${path}`, BASE_URL);

  if (options.query !== undefined) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      // Cookie sessions, not tokens. The backend sets an httpOnly cookie and
      // its CORS config names this exact origin — a wildcard origin plus
      // credentials is silently rejected by the browser.
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
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

export async function listProducts(filters: ProductFilters = {}): Promise<Paginated<Product>> {
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

export async function getProduct(slug: string): Promise<Product> {
  if (USE_MOCK) {
    const found = mockProducts.find((product) => product.slug === slug);
    if (found === undefined) {
      throw new ApiClientError(404, { code: 'NOT_FOUND', message: 'No such product.' });
    }
    return found;
  }
  return request<Product>(`/products/${encodeURIComponent(slug)}`);
}

/* ============================================================== tutorials */

export async function listTutorials(): Promise<Tutorial[]> {
  if (USE_MOCK) return mockTutorials;
  return request<Tutorial[]>('/tutorials');
}

export async function getTutorial(slug: string): Promise<Tutorial> {
  if (USE_MOCK) {
    const found = mockTutorials.find((tutorial) => tutorial.slug === slug);
    if (found === undefined) {
      throw new ApiClientError(404, { code: 'NOT_FOUND', message: 'No such tutorial.' });
    }
    return found;
  }
  return request<Tutorial>(`/tutorials/${encodeURIComponent(slug)}`);
}

/* ================================================================ contact */

export async function sendContactMessage(input: ContactRequest): Promise<void> {
  if (USE_MOCK) return;
  await request<{ received: true }>('/contact', { method: 'POST', body: input });
}

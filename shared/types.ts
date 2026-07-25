/**
 * Foldify — shared API contract.
 *
 * This file is the single source of truth for every shape that crosses the
 * network boundary. Backend query functions return these types; the frontend
 * api-client consumes them. If the two sides ever disagree, this file wins.
 *
 * No build step: the frontend transpiles it via `transpilePackages`, the
 * backend runs it directly under `tsx`.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** SQLite has no boolean type; 0/1 integers cross the wire and are mapped at the query layer. */
export type SqliteBool = 0 | 1;

/** ISO-8601 timestamp string, e.g. `2026-07-25T11:04:00.000Z`. */
export type IsoDate = string;

/* ------------------------------------------------------------------ */
/* Users, roles, sessions                                              */
/* ------------------------------------------------------------------ */

export type Role = 'customer' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  createdAt: IsoDate;
}

/** Never leaves the backend — includes the password hash. */
export interface UserWithSecret extends User {
  passwordHash: string;
}

export interface Session {
  id: string;
  userId: number;
  createdAt: IsoDate;
  expiresAt: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  /** Minor units (paisa). Integers only — never store money as a float. */
  priceMinor: number;
  currency: 'NPR';
  imageUrl: string | null;
  categoryId: number;
  /** Denormalised for list views; populated by the join query. */
  categoryName?: string;
  stock: number;
  difficulty: Difficulty;
  isPublished: boolean;
  createdAt: IsoDate;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ProductFilters {
  categorySlug?: string;
  difficulty?: Difficulty;
  search?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'name';
  page?: number;
  perPage?: number;
}

/* ------------------------------------------------------------------ */
/* Tutorials                                                           */
/* ------------------------------------------------------------------ */

export interface Tutorial {
  id: number;
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  coverImageUrl: string | null;
  isPublished: boolean;
  createdAt: IsoDate;
  /** Present on the detail response, absent on list responses. */
  steps?: TutorialStep[];
}

export type FoldType = 'valley' | 'mountain' | 'reverse' | 'squash' | 'petal' | 'other';

export interface TutorialStep {
  id: number;
  tutorialId: number;
  stepNumber: number;
  instruction: string;
  foldType: FoldType;
  imageUrl: string | null;
  /** Provisional link to a CraftFile — see the note on `CraftFile` below. */
  craftFileId: string | null;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalMinor: number;
  currency: 'NPR';
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  paymentRef: string | null;
  createdAt: IsoDate;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  /** Snapshot at purchase time — the product row may change later. */
  productName: string;
  unitPriceMinor: number;
  quantity: number;
}

/* ------------------------------------------------------------------ */
/* Reviews and contact                                                 */
/* ------------------------------------------------------------------ */

export interface Review {
  id: number;
  productId: number;
  userId: number;
  authorName?: string;
  /** Integer 1–5, enforced by a CHECK constraint in schema.sql. */
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: IsoDate;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  isHandled: boolean;
  createdAt: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Cart — client-side only, never persisted server-side                */
/* ------------------------------------------------------------------ */

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  unitPriceMinor: number;
  imageUrl: string | null;
  quantity: number;
}

/* ------------------------------------------------------------------ */
/* Craft Maker                                                         */
/* ------------------------------------------------------------------ */

/**
 * PROVISIONAL — pending an animation spike.
 *
 * Do not build against this shape yet. The fold format will be designed once
 * we know what the animation player actually needs to render; anything more
 * specific written today will be wrong. Kept here only so references compile.
 */
export interface CraftFile {
  id: string;
  name: string;
  version: 1;
  /** Opaque until the format is designed. */
  data: unknown;
  createdAt: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Transport envelopes                                                 */
/* ------------------------------------------------------------------ */

export interface ApiError {
  code: string;
  message: string;
  /** Field-level messages for form errors, keyed by field name. */
  fields?: Record<string, string>;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/* Request / response shapes for endpoints that exist today            */
/* ------------------------------------------------------------------ */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  body: string;
}

export type ModuleHealth = 'ok' | 'degraded' | 'down' | 'not-implemented';

export interface StatusResponse {
  service: 'foldify-api';
  version: string;
  environment: string;
  /** Seconds since the process started. */
  uptimeSeconds: number;
  timestamp: IsoDate;
  database: {
    connected: boolean;
    path: string;
    foreignKeys: boolean;
    journalMode: string;
    tables: number;
  };
  modules: Record<string, ModuleHealth>;
}

/* ------------------------------------------------------------------ */
/* Payment gateway (simulated for now)                                 */
/* ------------------------------------------------------------------ */

export interface PaymentInitiation {
  reference: string;
  redirectUrl: string;
  amountMinor: number;
  provider: 'simulated' | 'esewa' | 'khalti';
}

export interface PaymentVerification {
  reference: string;
  status: 'success' | 'failed' | 'pending';
  verifiedAt: IsoDate;
}

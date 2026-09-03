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
  /**
   * The "compare at" / reference price in minor units, when this model is on
   * sale. The customer pays `priceMinor` (which is therefore already the sale
   * price); `compareAtPriceMinor` is the higher original shown struck through.
   * Null when the model is not discounted.
   */
  compareAtPriceMinor: number | null;
  currency: 'NPR';
  imageUrl: string | null;
  categoryId: number;
  /** Denormalised for list views; populated by the join query. */
  categoryName?: string;
  stock: number;
  /**
   * How hard this model is TO FOLD, on the same scale as `Tutorial.difficulty`
   * — so "beginner" means one thing across the whole site whether you are
   * buying the crane or learning it. It is a property of the origami, never of
   * the object's quality, size or price.
   */
  difficulty: Difficulty;
  isPublished: boolean;
  createdAt: IsoDate;
}

/** Fold difficulty. Shared by products and tutorials so one crane rates the same on both. */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * A tutorial that teaches the model a product is folded from, resolved through
 * the `tutorial_product_links` join table. Rendered as the "fold it yourself"
 * link on the product detail page.
 */
export interface LinkedTutorial {
  slug: string;
  title: string;
}

/**
 * The detail-page response. Kept separate from `Product` so list endpoints are
 * not obliged to compute review aggregates for every row they return.
 */
export interface ProductDetail extends Product {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  /** The tutorials that teach this product's fold, oldest pairing first. */
  linkedTutorials: LinkedTutorial[];
}

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
  /** The shop products that are this fold, pre-folded — detail response only. */
  linkedProducts?: LinkedProduct[];
}

/**
 * A finished product a tutorial's fold is sold as, resolved through the
 * `tutorial_product_links` join table. Rendered as the "buy the finished
 * model" link on the tutorial page.
 */
export interface LinkedProduct {
  slug: string;
  name: string;
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
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/**
 * A customer record as the admin users page renders it. Exactly `User` with
 * an added plain-text join of the shipping name(s) on that account's orders —
 * a lightweight way to recognise a customer without a dedicated profile table.
 * `passwordHash` is never included (getUserById strips it at the query layer).
 */
export interface AdminUser extends User {
  orderCount: number;
  totalSpentMinor: number;
}

/** Aggregate numbers for the admin Overview page. Counts only, no charts. */
export interface AdminOverview {
  users: number;
  products: number;
  publishedProducts: number;
  tutorials: number;
  publishedTutorials: number;
  orders: number;
  ordersPending: number;
  contactUnhandled: number;
  categories: number;
  reviews: number;
}

/**
 * An order as the admin orders page renders it: every order across all
 * customers, with the customer's email joined in, newest first.
 */
export interface AdminOrder extends Order {
  customerEmail: string;
  customerName: string;
}

/** What the admin sends to promote or demote a user's role. */
export interface UpdateUserRoleRequest {
  role: Role;
}

export interface UpdateProductRequest {
  slug?: string;
  name?: string;
  description?: string;
  /** Entered in rupees on the form, converted to paisa on the way in. */
  priceMinor?: number;
  /** Compare-at price in minor units; null/omitted clears the discount. */
  compareAtPriceMinor?: number | null;
  imageUrl?: string | null;
  categoryId?: number;
  stock?: number;
  difficulty?: Difficulty;
  isPublished?: boolean;
}

export interface CreateProductRequest extends Omit<UpdateProductRequest, 'isPublished'> {
  slug: string;
  name: string;
  description: string;
  /** Entered in rupees on the form, converted to paisa on the way in. */
  priceMinor: number;
  categoryId: number;
  stock: number;
  difficulty: Difficulty;
}

export interface CreateCategoryRequest {
  slug: string;
  name: string;
  description?: string | null;
}

export interface CreateTutorialRequest {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  coverImageUrl?: string | null;
}

export interface UpdateTutorialRequest {
  slug?: string;
  title?: string;
  summary?: string;
  difficulty?: Difficulty;
  estimatedMinutes?: number;
  coverImageUrl?: string | null;
  isPublished?: boolean;
}

export interface AppendTutorialStepRequest {
  instruction: string;
  foldType: FoldType;
  imageUrl?: string | null;
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

/**
 * What the browser may send when placing an order: product ids and quantities,
 * and where it goes. Deliberately no prices and no total — those are read from
 * the products table server-side, because a total posted by the browser is a
 * total the customer chose.
 */
export interface CreateOrderRequest {
  items: { productId: number; quantity: number }[];
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
}

export interface CreateOrderResponse {
  order: Order;
  payment: PaymentInitiation;
}

export interface CreateReviewRequest {
  rating: Review['rating'];
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

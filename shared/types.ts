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
  /** The Craft Maker fold the player animates. Detail response only; null when unauthored. */
  craftFile?: CraftFile | null;
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
  /** The CraftFile whose fold sequence this step belongs to; null when unauthored. */
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
 * The fold format, designed against the animation spike (see CHANGELOG 0.6.0).
 *
 * A CraftFile is a rectangular sheet plus an ORDERED list of straight folds.
 * Nothing about the folded state is stored: the player replays the steps from
 * the flat sheet, so the file stays small and there is exactly one description
 * of the model. Coordinates are sheet millimetres, origin top-left.
 */

export interface CraftPoint {
  x: number;
  y: number;
}

export type CraftSheetPreset =
  | 'a4-portrait'
  | 'a4-landscape'
  | 'a5-portrait'
  | 'letter-portrait'
  | 'square'
  | 'custom';

export interface CraftSheet {
  preset: CraftSheetPreset;
  /** Millimetres. Only the ratio matters on screen; the viewBox is derived. */
  width: number;
  height: number;
}

/**
 * An author-placed point on the sheet outline, used as a snap target by the
 * Craft Maker. The player ignores these — a step carries its own coordinates.
 */
export interface CraftVertex {
  id: string;
  x: number;
  y: number;
}

/** Which half-plane of the directed line `from` -> `to` is the flap that moves. */
export type CraftFoldSide = 'left' | 'right';

export type CraftStepKind = 'fold' | 'crease';

/** How far down the stack a fold reaches: everything, or the top N layers. */
export type CraftLayerScope = 'all' | number;

export interface CraftFoldStep {
  id: string;
  /**
   * The fold line, resolved to coordinates at authoring time rather than to
   * vertex ids: replay then depends on nothing but the step list, and editing
   * a snap point later cannot silently rewrite a fold that is already drawn.
   */
  from: CraftPoint;
  to: CraftPoint;
  side: CraftFoldSide;
  /**
   * The authoring gesture: the point that was folded, and where it was folded
   * to. The crease above is the perpendicular bisector of the two, and `side`
   * is the half `origin` sits in — both are derived from this pair rather than
   * drawn freehand, which is what stops a recorded fold from being a guess.
   *
   * Optional: the player never reads them, and a file authored before the
   * gesture was recorded still replays from `from`/`to`/`side` alone.
   */
  origin?: CraftPoint;
  target?: CraftPoint;
  /** `valley` settles the flap on top of the stack, `mountain` underneath. */
  foldType: FoldType;
  /**
   * `crease` marks the line into the paper and leaves it flat - origami's
   * "fold and unfold". Optional and defaulting to `fold` so existing files
   * replay unchanged.
   */
  kind?: CraftStepKind;
  /**
   * How far down the stack the fold reaches: `all` folds the whole model,
   * a number folds only that many layers from the top. Folding one wing of a
   * plane must not drag the wing behind it along. Optional, defaulting to
   * `all`, so existing files replay unchanged.
   */
  layerScope?: CraftLayerScope;
  instruction: string;
  durationMs: number;
}

export interface CraftFileData {
  sheet: CraftSheet;
  vertices: CraftVertex[];
  steps: CraftFoldStep[];
}

/** Where a fold project sits in its lifecycle: still being authored, or live. */
export type CraftStatus = 'draft' | 'deployed';

export interface CraftFile {
  id: string;
  name: string;
  version: 1;
  /** The tutorial this fold belongs to, or null while it is a draft. */
  tutorialId: number | null;
  status: CraftStatus;
  data: CraftFileData;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface SaveCraftFileRequest {
  name: string;
  tutorialId?: number | null;
  status?: CraftStatus;
  data: CraftFileData;
}

/** A saved snapshot of a craft project, written on every save. */
export interface CraftFileVersion {
  id: number;
  craftFileId: string;
  /** 1-based, increments per save of that project. */
  revision: number;
  name: string;
  data: CraftFileData;
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

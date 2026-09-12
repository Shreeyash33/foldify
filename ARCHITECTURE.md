# Foldify — System Architecture

This document describes the technical architecture of Foldify: an origami shop and fold-tutorial platform. It covers the overall topology, the responsibilities of each layer, the data model, and the design of the fold-rendering engine.

## 1. Overview

Foldify is a full-stack web application with three distinct parts, organised as an npm workspace monorepo:

| Package | Directory | Role |
|---|---|---|
| `foldify` (frontend) | `frontend/` | Next.js 16 App Router, React 19, Tailwind v4, GSAP |
| `@foldify/backend` | `backend/` | Express 4 REST API, SQLite via `better-sqlite3` |
| `@foldify/shared` | `shared/` | Shared TypeScript types importable by both sides |

The frontend serves a storefront (product catalogue, cart, checkout), a tutorial section with a fold-animation player, and an admin area. The backend exposes a single REST API under `/api/*` and owns the database. The shared package carries the API contract (`shared/types.ts`) so the two sides cannot drift apart.

```
                     browser
                        |
         +--------------+--------------+
         |                             |
   Next.js :3000                 Express :4000
   App Router                    /api/*
         |                             |
   app/lib/api-client.ts  --------->  routes/    HTTP only
   (the only place fetch              services/  business logic
    is called)                        db/queries SQL only
                                          |
                                    SQLite (WAL)
                                    backend/data/foldify.db
                        ^
                        |
               shared/types.ts
         (imported by both sides, no build step)
```

## 2. Runtime topology

### 2.1 Frontend (`:3000`)

- Server-rendered pages via the App Router. All data fetching from pages goes through `app/lib/api-client.ts`, the single file in the project that calls `fetch`.
- A closed component library lives in `app/components/ui/`. Pages compose these components; raw colour/padding/typography utilities are not used in page files.
- Four application contexts provide cross-cutting state: `Theme` (with a pre-paint script to avoid flashes), `Auth`, `Cart`, and `Toast`.
- The fold player (`app/components/craft/FoldStage.tsx`) is an SVG renderer animated by GSAP, shared between the authoring tool and the public tutorial player.

### 2.2 Backend (`:4000`)

Strictly layered, with each layer one file per concern:

```
routes/       HTTP only — parse, validate, call something, respond
services/     business logic — no SQL, no req, no res
db/queries/   SQL only — no HTTP awareness, no business rules
```

- Schema is declared in `backend/src/db/schema.sql`; access is exclusively through prepared statements. There is no ORM.
- Responses never expose raw rows: query functions map `snake_case` columns to the `camelCase` fields of `@foldify/shared` types.
- Middleware: `requireAuth`, `requireAdmin`, and a central `errorHandler` for uniform error responses.

### 2.3 Shared contract

`shared/types.ts` defines the types exchanged over the API — products, tutorials, orders, cart items, the `CraftFile` fold format — plus the money convention `priceMinor` (integer paisa). Both apps import from the same package, so a field added on one side is enforced on the other at compile time.

## 3. Data model

SQLite with WAL mode, foreign keys enabled, and CHECK constraints. There is deliberately no `cart` table: the cart lives in the frontend context, and a firm order is materialised row-by-row only at checkout.

| Table | Purpose |
|---|---|
| `users` | Accounts; `role` distinguishes `customer` vs `admin` |
| `sessions` | Cookie-backed sessions for `requireAuth` |
| `categories` | Product groupings |
| `products` | Sellable items; `slug`, prices in paisa, optional `compareAtPriceMinor`, soft delete; product type field |
| `tutorials` | Fold instructions; `difficulty` shared with `products` |
| `tutorial_steps` | Ordered steps; each may attach a `craft_file_id` |
| `tutorial_product_links` | Many-to-many: which tutorial folds which product |
| `craft_files` | Authored fold data stored as a JSON blob |
| `craft_file_versions` | Version history for craft files |
| `orders` | Customer orders; totals recomputed server-side |
| `order_items` | Line-item snapshot of price/quantity at sale time |
| `reviews` | Per-user ratings on products (`UNIQUE(product_id, user_id)`) |
| `product_views` / `tutorial_views` | Analytics counters |
| `contact_messages` | Contact-form submissions with a handled flag |

Normalisation notes (see the report's database-design chapter):

- `order_items` snapshots price and title so later product changes cannot rewrite history.
- Orders freeze the shipping address at purchase time.
- `craft_files.data` is a stored JSON document; it is opaque to SQL and parsed in application code only.

## 4. Authentication and authorisation

- Passwords are hashed with `bcryptjs` at cost 10.
- Logging in creates a row in `sessions` and sets a signed cookie (`foldify_sid` by default). CORS is configured for the exact `FRONTEND_ORIGIN`, so the cookie arrives on credentialed requests.
- Admin routes additionally require the session's user to have `role = 'admin'` via `requireAdmin`. The frontend gate is a usability layer; the server check is the enforcement point.

## 5. Checkout and payments

- `POST /api/orders` validates stock, recomputes totals and totals' taxes server-side from the `products` table, and (when configured to use the live gateway) initiates a Khalti payment.
- `POST /api/orders/:id/verify` is always called server-side to confirm payment and commit the order; stock is released via `restoreStockForOrder` when an order fails or is cancelled.
- `payment.service.ts` selects the gateway from configuration: the Khalti sandbox is used when `KHALTI_SECRET_KEY` is present, otherwise an in-memory simulated gateway stands in. Going live requires only real merchant credentials.

## 6. The fold engine

The geometry that powers both the Craft Maker (authoring) and the tutorial player is implemented in `frontend/app/lib/craft/`:

- `geometry.ts` — Sutherland–Hodgman half-plane clipping, reflection, and perpendicular-bisector helpers.
- `fold-model.ts` — the layering model. Paper after N folds is an ordered stack of convex polygons. A fold cuts every layer along the fold line; pieces on the moving side reflect across it and re-stack in reverse order. A valley fold drops the group on top; a mountain fold slides it underneath.
- `craft-file.ts` — presets, gesture-to-fold conversion, and parsing of the `CraftFile` format.

The model relies on convexity being preserved by clipping and reflection: every layer stays convex for the life of a sequence, area is conserved exactly, and the whole engine needs no polygon-boolean library and no physics. Layers are capped at 96 because a pathological sequence doubles the layer count per fold; real tutorials stay in the low tens.

The animation renders one shared SVG (`FoldStage.tsx`) from the authoring tool and the public player. GSAP tweens a single scalar — the fold's progress — and each frame rebuilds the layer paths from it. `prefers-reduced-motion` snaps instead of animating.

Not modelled (deliberately): paper thickness, layers trapped inside a pocket, curved folds, and true reverse/squash/petal folds that push a flap through the layer stack. Steps typed `reverse`, `squash`, or `petal` still animate as the straight fold their line describes.

## 7. Assets

Product images are self-generated SVG files written by `scripts/gen-product-svgs.js` into `frontend/public/products/`. The database stores only the URL path (`/products/{slug}.svg`); the image files are static assets served by Next.js and referenced by the frontend. Texture tiles under `frontend/public/textures/` are optional enhancements with CSS-gradient fallbacks.

## 8. Verification

Three gates must pass before a change is merged:

```
npm run typecheck
npm run lint
npm run build
```

The fold engine is additionally verified numerically (area conservation, mid-fold projection, gesture accuracy) in a replay harness, and via unit tests (`geometry.test.ts`, 25 tests).

## 9. Craft Maker — current status

The Craft Maker (`frontend/app/admin/craft-maker/`) is the authoring tool that produces the fold sequences the player animates. It is substantially built but remains a work in progress.

### 9.1 Built and verified

| Area | Evidence |
|---|---|
| Fold engine conserves paper area exactly | replay harness, 40000 sq mm at every step of a 7-fold sequence |
| Mid-fold projection is correct | t=0.5 collapses the flap to a crease, as an overhead view must |
| Gesture folds land the point on the destination | 5 cases, max error 4.0e-14 |
| Crease steps leave geometry untouched | layer count and polygons byte-identical before/after |
| Layer scope leaves lower layers alone | scope=1 keeps the bottom layer byte-identical; `all` does not |
| Two faces render with different fills | rendered markup on a fresh prod server |
| Seeded fold shows both faces at every step | rasterised per step, worst step 22% minority face |
| Craft-file API round trip | create/patch/delete/restore over curl, 401 unauthenticated, 404 on unknown revision |

### 9.2 Not yet verified

- Every interactive control in the Craft Maker — fold picking, snapping, the live crease preview, vertex select/edit/delete, the draft panel, the layer-scope control, project deploy, history restore — is compile-checked only.
- The fold player in motion: GSAP tween wiring, auto-play, and the crease fold-and-return animation were never watched end-to-end; the per-frame geometry is derived from the verified engine, but the animation itself is unexercised.
- The canvas-resize fix was reasoned about and changed but never observed resizing.
- Visual appearance: no screenshots of the authoring tool were ever taken.

So "typecheck/lint/build pass" for this feature means *it compiles*, not *it works*.

### 9.3 Known-suspect areas, in priority order

1. **Flip side.** Flipping which half moves mirrors the whole model across the crease (X flip on a vertical crease, Y flip on a horizontal one) — geometrically correct but disorienting. A fix also swaps `origin`/`target` so the recorded gesture stays truthful, but it is unconfirmed whether that addresses what was intended (valley/mountain might be wanted instead).
2. **Layer scope defaults to `all`.** The layer-scope problem only goes away if the author explicitly sets a scope; the default may need to be smarter, or infer the scope from the clicked layer.
3. **The seeded demo fold is not a crane.** It is a geometrically valid sequence chosen so both paper faces stay visible, but its attached instructions are the real crane's seven steps, so text and animation do not describe the same model.
4. **`shared/types.ts` accreted four rounds of additions** (`origin`/`target`, `kind`, `layerScope`, `status` + `CraftFileVersion`), all optional except `status`. As the shared contract, changes there should be reviewed before merging.

### 9.4 Worth knowing

- `getTutorialShell` uses `'use cache'` with `cacheLife('hours')`: after a reseed, a tutorial page keeps serving the old fold until the cache expires or the dev server restarts. The API (`/api/tutorials/<slug>`) is the source of truth.
- A fold line that does not cross the current shape is not treated as an error; it folds nothing and plays as a dead frame.
- A fold that halves the shape exactly covers the stationary half, so the model reads as one flat colour; only counting visible faces catches this, not area or layer counts.
- `backend/src/db/index.ts` carries a guarded `ALTER TABLE craft_files ADD COLUMN status` so an existing `foldify.db` self-heals; it must not be dropped.

### 9.5 Reverting cleanly

The feature is additive. The public player degrades to a written step list when a tutorial has no craft file, so deleting the `craft_files` rows disables the animation without breaking `/learn`. Removing `frontend/app/admin/craft-maker/` is likewise a clean removal of the authoring tool on its own.
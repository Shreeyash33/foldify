# Changelog

All notable changes to Foldify. Newest first.

## [0.3.0] — 2026-09-03

### Added

**Homepage marketing page** (`/`)
- `/` now renders a proper landing page instead of the design-system showcase: a cardboard hero banner with a headline and two calls to action, a curated "Featured" strip of in-stock products, and a "Learn" section linking to `/products` and `/learn`.
- The showcase remains available at `/showcasepage` for the design system reference.
- The featured strip is client-fetched with a skeleton and skips sold-out rows, so the static hero shell never depends on the API at build time.
- Featured cards are ~50% smaller (single row, up to four columns); "Featured" and "Learn" are plain section titles rather than buttons, with CTAs linking to `/products` and `/learn`.

**Sales / compare-at price**
- Products gain an optional `compareAtPriceMinor` (the struck-through original). `priceMinor` remains the real charged price, so the discounted figure flows through the cart, checkout and orders with no pricing change.
- Full stack: new nullable `compare_at_price_minor` column (with a self-healing `ALTER TABLE` migration for existing DBs), typed through the shared contract, admin create/edit field, validation (compare-at must exceed the sale price), seeded discounts on five models, and struck-through display on product cards and the product detail page.
- The homepage featured strip prioritises discounted in-stock items.

## [0.2.0] — 2026-09-02

### Added

**Admin section** (the whole `/admin` area)
- Backend endpoints behind `requireAuth` + `requireAdmin`: product CRUD + soft delete, category creation, tutorial CRUD + step appending, order status updates, users list with role changes, contact inbox with handled toggle, overview metrics.
- Frontend under `/admin`: gate (`AdminGate`), sidebar (`Overview / Items / Orders / Users / Inbox / Craft Maker`), and pages for product items (modal create/edit, rupees→paisa, inline confirm-delete, "+ New category" inline form), order status, user roles, and the contact inbox.

**Product ⇄ tutorial cross-linking**
- `tutorial_product_links` join table; `GET /api/products/:slug` returns `linkedTutorials`, `GET /api/tutorials/:slug` returns `linkedProducts`.
- Product detail page shows a "Fold it yourself" link to the matching tutorial; tutorial pages show a "Buy the finished fold" link to the matching product.

**Contact page** — `/contact` is now a real form (name, email, subject, message) wired to `POST /api/contact`, with validation errors keyed by field and a signed-in name/email prefill.

**Write-a-review UI** — product pages gain a review form (rating 1–5 + message, sign-in prompt when logged out). Reviews now load fresh per visit so a just-posted review appears immediately; duplicate reviews surface the API's 409 as a visible error.

**Shop polish**
- Pagination bar is always drawn, so it can no longer disappear when a filter or the catalogue size leaves a single page.
- Footer no longer links into the tutorial content pages.

### Changed
- Seed now also declares which products map to which tutorials, and re-seeding rebuilds the link table exactly.
- Shared contract adds `LinkedTutorial`, `LinkedProduct`, `ProductDetail.linkedTutorials`, and `Tutorial.linkedProducts`.

## [0.1.0] — 2026-07-25

Initial scaffold. The skeleton and the design system, not the features.

### Added

**Repo**
- npm workspaces monorepo: `frontend`, `backend`, `shared`
- Node pinned to 22 via `.nvmrc` and `engines` — `better-sqlite3` ships
  prebuilt binaries per Node ABI, so a matched version means no compiler
- `.gitattributes` normalising line endings across three Windows machines
- `concurrently` scripts: `dev`, `dev:frontend`, `dev:backend`, `build`, `seed`,
  `typecheck`, `lint`

**Design system** — paper and cardboard
- Ten colour tokens with a dark-mode re-tune, defined once in `globals.css`
  under Tailwind v4 `@theme inline`; class-based dark mode via `@custom-variant`
- Material recipes `.surface-paper` / `-cardboard` / `-crumpled` / `-sunken`,
  irregular cut-paper radii, two-layer shadows with a top-left light source
- Texture routed through CSS variables with gradient fallbacks, so every
  surface looks correct with zero image files present
- Fraunces / Karla / JetBrains Mono via `next/font`, latin subset, `swap`

**Frontend**
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4
- Closed component library: `PaperSurface`, `Button`, `Card`, `Input`,
  `Textarea`, `Select`, `Checkbox`, `Switch`, `Badge`, `Modal`, `Spinner`,
  `Skeleton`, `Tabs`, `CreaseDivider`, `ThemeToggle`, `ResizablePanel`
- Layout: `Navbar`, `Footer`, `Container`, `PageHeader`, `AdminSidebar`
- `CreaseDivider` — the signature element, drawn in real origami notation
- `ResizablePanel` — pointer capture, 24px hit area, keyboard resizing,
  stacks and disables below `md`
- Contexts: `Theme` (no flash — blocking pre-paint script), `Auth`, `Cart`
  (localStorage, no server cart), `Toast`
- `lib/api-client.ts` as the only place `fetch` is called, with `USE_MOCK`
- `lib/hooks.ts` (`useIsHydrated`, `useMediaQuery`) and `lib/cart-store.ts`,
  both built on `useSyncExternalStore` — browser-only state is read during
  render with a distinct server snapshot, so there is no hydration mismatch
  and no `setState` in an effect costing a second render on every mount
- Component showcase at `/` — every component, variant, size and state, with
  the JSX to copy and the live `/api/status` output
- 14 placeholder routes so nobody hits a 404

**Backend**
- Express 4 under `tsx`, layered `routes` / `services` / `db/queries`
- SQLite via `better-sqlite3`, raw SQL, `PRAGMA foreign_keys = ON` and WAL
- 12 tables with real foreign keys, CHECK constraints and indexes; no cart table
- Working: `GET /api/status`, `GET /api/auth/me`, `GET /api/products`,
  `GET /api/tutorials`, `GET /api/orders`, `POST /api/contact`
- Everything else registered as a 501 stub with build notes
- Cookie sessions (`httpOnly`, `sameSite: lax`), `bcryptjs`, hand-rolled
  validator, typed error envelope that never leaks a stack trace
- Idempotent seed: admin user, 4 categories, 12 products, 2 tutorials

**Shared**
- `shared/types.ts` — the API contract for both sides, no build step

### Notes

- `CraftFile` is a deliberate placeholder pending an animation spike. The fold
  format is not designed yet and should not be built against.
- Texture image files do not exist yet — see `frontend/public/textures/README.md`.
- `npm audit` reports advisories in `brace-expansion`, reachable only through
  ESLint's dev-time tree. Fixing means ESLint 10, a breaking change for no
  runtime benefit. Left alone deliberately.

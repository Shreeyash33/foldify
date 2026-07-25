# Changelog

All notable changes to Foldify. Newest first.

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

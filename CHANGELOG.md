# Changelog

All notable changes to Foldify. Newest first.

## [0.4.0] — 2026-09-03

### Added

**Craft Maker and the fold animation player** — the spike is done and the feature is built.

*The fold format.* `CraftFile` in `shared/types.ts` is no longer a placeholder. A file is a rectangular sheet plus an **ordered list of straight folds**; nothing about the folded state is stored, because the player replays the steps from the flat sheet. Coordinates are sheet millimetres. A step carries its fold line as resolved coordinates rather than vertex ids, so replay depends on the step list alone and editing a snap point cannot silently rewrite a fold already drawn.

*The layering model* (`frontend/app/lib/craft/fold-model.ts`) — this was the hard part of the spike. Paper after N folds is an ordered stack of convex polygons, bottom first. A fold cuts every layer along the fold line; the pieces on the moving side are reflected across it and re-stacked as a group **in reverse order**, since the sheet nearest the top of a flap ends up nearest the bottom once the flap is turned over. A valley fold drops the group on top of the stack, a mountain fold slides it underneath.

The model leans on one property: a rectangle is convex, and both half-plane clipping and reflection preserve convexity, so **every layer stays convex for the life of a sequence**. That is why the whole engine is a Sutherland-Hodgman clip plus a cosine and needs no polygon-boolean library and no physics. Area is conserved exactly across folds.

*The tradeoff, stated plainly.* Not modelled: paper thickness, layers trapped inside a pocket, and true reverse/squash/petal folds, which move part of a flap *through* the stack rather than over it. Steps typed `reverse`, `squash` or `petal` still animate, as the straight fold their line describes. Layers are capped at 96 because a pathological sequence doubles the count per step; real tutorials sit in the low tens.

*The animation.* `FoldStage` (`frontend/app/components/craft/FoldStage.tsx`) is one SVG shared by the authoring preview and the public player, so a fold cannot look one way to the author and another to the reader. GSAP tweens a single scalar — the fold's progress — and each frame rebuilds the layer paths from it. MorphSVG is a Club GreenSock plugin and is not on npm, so the morph is done by hand; that is cheaper than it sounds, because the split of each layer into flap and remainder does not depend on progress, so the path elements mount once per transition and only their `d` changes. React never re-renders during a tween. Seen from overhead a flap rotating out of plane only narrows by `cos(theta)`, so it closes to a crease at the halfway point and opens out mirrored on the far side. `prefers-reduced-motion` snaps instead.

*Two-tone paper.* The sheet is coloured on one face and white on the other, as origami paper is, because once the sheet stops being flat that is the only cue for which face you are looking at. The layer's reflection count decides it, so an even count is the side that started upwards - the coloured one, matching the "start coloured side up" the instructions open with. Fills are opaque: translucent layers blend the faces into each other, which is what made the first attempt (two near-identical off-whites) unreadable. The fold-line indicator and the Craft Maker's snap handles are drawn in `--color-beni` so they read against either face.

*Why the demo fold sequence is corners-and-offset-edges.* Two-tone paint is not enough on its own. **A fold that halves the shape exactly covers the stationary half completely**, so the flap's back face becomes the only thing on screen and the model reads as one flat colour no matter how the faces are painted. The first seeded sequence did exactly that and rendered 100% white from fold 1 onward. The folds are now corners and offset edges, and the sequence is checked by rasterising each step and counting which face the viewer actually sees — the worst step still shows 22% of the minority face. Verifying area and layer counts, as the first pass did, does not catch this: the geometry was correct and invisible.

*Craft Maker* (`/admin/craft-maker`) replaces the placeholder: a sheet-preset canvas (A4 default, plus custom width/height), an add-vertex tool that drops a foldable point anywhere on an existing edge, a **gesture-based fold tool** — click the point of the paper that moves, then click where it lands — an ordered step recorder with reorder/delete/flip-side, and playback of the whole sequence. The crease is the perpendicular bisector of the two picks and the moving half is the half the first pick sits in; fold type and which half travels are then chosen explicitly, and nothing reaches the step list until Record.

*Why the fold tool asks for a gesture rather than a crease.* The first version took two clicks that drew the crease itself, which left the author computing a perpendicular bisector in their head before every fold — "where is the line that puts this corner on that one" is precisely the arithmetic the machine should be doing. And the two things a crease alone does not say, which half moves and what kind of fold it is, were filled in as `side: 'left'` and `foldType: 'valley'`, which were right about half the time — so a recorded sequence read as though the tool were guessing, because it was. Point-and-destination closes both gaps: the crease and the moving half are *derived* from the picks instead of assumed, and the two genuinely authorial choices are asked for out loud. The gesture is kept on the step as `origin`/`target`, both optional — the player reads only `from`/`to`/`side`, so a file authored before this change replays unchanged.

*Public player* — `frontend/app/learn/[slug]/FoldPlayer.tsx` animates the real fold instead of showing a placeholder slot, with step forward/back, auto-play and restart. Tutorials with no authored fold keep working as a written step list. The canvas size control now resizes the paper: the stage fills its box absolutely rather than as a flex item (as a flex child it sized itself from its own aspect ratio and sat still while the box grew), and the control's ceiling is measured from the column it actually has, so `+` stops when the paper stops growing instead of counting up past a limit `min(size, 100%)` had already imposed.

*Storage* — new `craft_files` table (one fold per tutorial, `data` as a JSON blob), `GET/POST/PATCH/DELETE /api/craft-files` behind `requireAuth` + `requireAdmin`, and `GET /api/tutorials/:slug` now returns `craftFile`. Attaching a file stamps `tutorial_steps.craft_file_id`, which was previously a dead column. The seed ships an authored fold for the traditional crane.

### Changed
- `shared/types.ts` — **team-owned file, and this change is the point of the PR, not a side effect.** The provisional `CraftFile` is replaced by the real format (`CraftPoint`, `CraftSheet`, `CraftSheetPreset`, `CraftVertex`, `CraftFoldSide`, `CraftFoldStep`, `CraftFileData`, `CraftFile`, `SaveCraftFileRequest`), and `Tutorial` gains `craftFile`.
- `gsap` added as a frontend dependency.

## [0.4.1] — 2026-09-05

### Fixed

**The fold player never shows a black flap again.** In dark mode `--color-paper-raised` — the token the back face had borrowed — is near-black, so the very first recorded fold, which newly presents the back face, rendered as a solid black void, and a flip-side that carried the big half across the model blacked out the whole canvas. The geometry was already correct; the paint was wrong. The back face is now the one fixed warm-white the design system already uses, pinned in `FoldStage.FACE_FILL` and documented there, so the two-tone "paper" cue stays legible in both themes while the coloured face still follows the theme.

**A destination near where the fold starts is not a misclick.** The fold tool's guard against folding a point onto itself used a radius that also ate every legitimate destination within a couple of millimetres of the origin — exactly where a small fold landing next to its starting point lives — so the click was silently swallowed and the gesture ran one pick behind. The guard now only rejects a true same-point fold and keeps the explanatory toast for that one case.

**The stage's fill intent is explicit.** The fold stage SVG now carries `width`/`height` of 100% and `preserveAspectRatio="xMidYMid meet"`, so fill-and-centre is guaranteed by the replaced element itself rather than by whatever CSS wraps it.

### Verified

The fold engine's numeric checks were re-run against the current source: area is conserved exactly across every tutorial step and both recorded-gesture repros, no NaN/Inf vertices appear, and the two-tone coverage ratios are unchanged. `npm run typecheck`, `npm run lint`, and `npm run build` (21 routes) all pass.

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

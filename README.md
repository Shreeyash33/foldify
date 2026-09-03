# Foldify

An origami shop and fold-tutorial site. Customers buy crafts, or they follow a tutorial for the fold.

**"Craft" means a finished piece of folded origami** — a crane, a kusudama, a masu box. The shop sells the folded models themselves, not the materials for folding them: there is no paper, no bone folders, no kits. Every product is something somebody folded, and where a tutorial exists for the same model, the two describe one fold at one difficulty.

**`difficulty` always means fold difficulty.** It is how hard the origami is to fold, on one scale — `beginner`, `intermediate`, `advanced` — shared by `products` and `tutorials` so the crane rates the same in both. It never describes an object's quality, size or price. If a row ever appears where "intermediate" would not answer *"how hard is this to fold?"*, that row is wrong, not the field.

BSc CSIT semester project with three developers.

---

## 1. Prerequisite: Node 22

```
node --version
```

If the output is not v22.x, install Node 22 LTS before continuing.

This requirement is functional, not stylistic. `better-sqlite3` is a native module distributed as prebuilt binaries for specific Node ABI versions. On Node 22, npm downloads a matching prebuilt `.node` file and no compiler is involved. On a Node version without a matching prebuild, npm falls back to compiling from source, which requires Visual Studio Build Tools — a large, time-consuming install. Keeping everyone on the same Node version avoids this.

`.nvmrc` pins the version. With [nvm-windows](https://github.com/coreybutler/nvm-windows):

```
nvm install 22
nvm use 22
```

## 2. Repository location

Clone to a short path, for example:

```
C:\dev\foldify
```

Avoid deeply nested paths such as:

```
C:\Users\you\Desktop\College\Semester 6\Projects\foldify
```

Windows imposes a 260-character path limit. A deep `node_modules` tree combined with an already-deep folder path can cause install failures with error messages that do not point to the actual cause.

## 3. Install and run

```
npm install          # run at the repo root; installs all three workspaces
npm run seed          # creates backend/data/foldify.db and populates it
npm run dev           # starts frontend on :3000 and backend on :4000
```

Then open <http://localhost:3000>. This is the marketing homepage — a hero banner, a curated strip of featured products, and links to the shop and the tutorials. The design-system showcase lives at <http://localhost:3000/showcasepage>.

Other available scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Runs both apps together, via `concurrently` |
| `npm run dev:frontend` | Runs the Next.js app only |
| `npm run dev:backend` | Runs the Express app only |
| `npm run build` | Production build of the frontend |
| `npm run seed` | Seeds the database (safe to re-run) |
| `npm run typecheck` | Type-checks both apps |
| `npm run lint` | Runs ESLint on the frontend |

## 4. Environment variables

Copy the example files and edit as needed:

```
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

| Variable | Where | Default |
|---|---|---|
| `PORT` | backend | `4000` |
| `FRONTEND_ORIGIN` | backend | `http://localhost:3000` |
| `SESSION_COOKIE_NAME` | backend | `foldify_sid` |
| `DB_PATH` | backend | `./data/foldify.db` |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000` |
| `NEXT_PUBLIC_USE_MOCK` | frontend | `true` |

`FRONTEND_ORIGIN` must match the frontend's origin exactly. CORS with credentials rejects a wildcard origin, and the resulting symptom — the session cookie never arriving — can be difficult to trace back to this setting.

### The `USE_MOCK` flag

When `NEXT_PUBLIC_USE_MOCK=true`, `lib/api-client.ts` returns the fixtures defined in `lib/mock-data.ts` and does not contact the backend. This allows the frontend to be developed and rendered independently of backend or API progress. Set it to `false` once the required endpoint is implemented and available.

## 5. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 16, App Router, React 19 | |
| Styling | Tailwind v4 — CSS-first, tokens defined in `globals.css`; there is no `tailwind.config.ts` | |
| Backend | Express 4 with `tsx` | |
| Database | SQLite via `better-sqlite3`; raw SQL, no ORM | An ORM would hide the SQL, and understanding the SQL is part of the assignment |
| Auth | Cookie-based sessions stored in a `sessions` table, using `bcryptjs` | `bcryptjs` is a pure JS implementation and requires no native build step |
| Animation | GSAP, driving a hand-written SVG path morph | MorphSVG is a paid Club GreenSock plugin and is not on npm; the fold engine tweens one scalar and rebuilds the paths, which needs no plugin |
| Types | `shared/types.ts`, imported by both frontend and backend | Keeps a single contract between the two and avoids drift |

Tailwind v4 is in use. Tokens are defined under `@theme` inside `app/globals.css`, dark mode is toggled manually via a `.dark` class using `@custom-variant`, and there is no `tailwind.config.ts` file.

## 6. Architecture

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

The backend is Express. Routes should not be created under `frontend/app/api/` — endpoints should have a single location.

## 7. Project layout

```
/
├── frontend/                Next.js
│   ├── app/
│   │   ├── layout.tsx       fonts, pre-paint theme script, providers, chrome
│   │   ├── page.tsx         the marketing homepage (hero + featured strip)
│   │   ├── providers.tsx    all four contexts
│   │   ├── contexts/        Theme, Auth, Cart, Toast
│   │   ├── components/
│   │   │   ├── ui/          the closed component library — not to be edited directly
│   │   │   ├── layout/      Navbar, Footer, Container, PageHeader, AdminSidebar
│   │   │   ├── craft/       FoldStage - the GSAP fold renderer, shared by maker and player
│   │   │   └── showcase/    showcase-page scaffolding only
│   │   ├── lib/             api-client, mock-data, utils, hooks, cart-store
│   │   │   └── craft/       fold geometry, the layering model, the CraftFile helpers
│   │   ├── (auth)/          login, register
│   │   ├── (shop)/          products, cart, checkout
│   │   ├── learn/           tutorials
│   │   └── admin/           admin section
│   ├── public/textures/     see README for the texture files still needed
│   └── app/globals.css      all design tokens for the project
│
├── backend/                 Express
│   └── src/
│       ├── server.ts        middleware order matters — see inline comments
│       ├── routes/          HTTP only
│       ├── services/        business logic, no SQL
│       ├── db/              schema.sql, seed.ts, queries/
│       ├── middleware/      errorHandler, requireAuth, requireAdmin
│       └── lib/             errors, validate, session
│
└── shared/types.ts          the API contract
```

## 8. Design system overview

The design uses two materials: paper (light, smooth, used as the writing surface) and cardboard (heavier, brown, used structurally). Texture is applied through small tileable images with CSS-gradient fallbacks. `filter`, `backdrop-filter`, and `feTurbulence` are avoided, since these re-rasterize on every paint and can cause dropped frames on lower-powered hardware. Depth is expressed through `box-shadow`, limited to at most two layers per element, with the light source positioned top-left. Dark mode is a separate visual tuning rather than a simple inversion. Corner radii are slightly irregular so surfaces read as cut paper. The signature UI element is `CreaseDivider`, drawn using real origami fold notation.

The component library is closed for direct edits. See `CONTRIBUTING.md` before building a new page.

## 9. Known gaps in this commit

- **Implemented endpoints:** `GET /api/status`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/products`, `GET /api/products/:slug` (includes `linkedTutorials` — the "fold it yourself" cross-links), `GET /api/products/:slug/reviews`, `POST /api/products/:slug/reviews`, `GET /api/tutorials`, `GET /api/tutorials/:slug` (includes `linkedProducts` — the "buy the finished fold" cross-links — and `craftFile`, the authored fold the player animates), `GET /api/orders`, `POST /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/verify`, `POST /api/contact`.
- **Admin endpoints (all behind `requireAuth` + `requireAdmin`):** `GET /api/admin/overview`, `GET /api/users`, `PATCH /api/users/:id/role`, `POST/PATCH/DELETE /api/products`, `GET /api/products/all`, `GET/POST /api/products/categories`, `GET /api/tutorials/all`, `POST/PATCH/DELETE /api/tutorials`, `POST /api/tutorials/:id/steps`, `GET /api/orders/all`, `PATCH /api/orders/:id/status`, `GET /api/contact`, `PATCH /api/contact/:id`, `GET/POST /api/craft-files`, `GET/PATCH/DELETE /api/craft-files/:id`.
- The admin pages under `/admin` are client-rendered and gated by a client-side role check; the real enforcement is `requireAdmin` on the server.
- The contact form is live (`/contact` → `POST /api/contact`), and customers can post reviews on the product detail page. Both surfaces are wired to the API and cannot do mock-mode submits (they need the backend running).
- Only the simulated payment gateway is wired (`/pay/.../verify`). A real eSewa or Khalti provider needs live merchant accounts and API keys — this is the one feature nobody can finish without credentials.
- Texture image files have not been added yet; see `frontend/public/textures/README.md`. Surfaces render acceptably without them in the meantime.
- **Craft Maker and the fold player are built** (`/admin/craft-maker`, `/learn/[slug]`), and `CraftFile` in `shared/types.ts` is now the real format. What they deliberately do NOT do: paper thickness, layers trapped inside a pocket, curved folds, and true reverse/squash/petal folds, which move part of a flap *through* the layer stack rather than over it. A step typed `reverse`, `squash` or `petal` still animates, as the straight fold its line describes. Layers are capped at 96. The model is a stack of convex polygons cut by a half-plane and reflected — see the 0.4.0 CHANGELOG entry for the reasoning and `frontend/app/lib/craft/fold-model.ts` for the code.
- Only the traditional crane has an authored fold in the seed. Every other tutorial renders as a written step list until somebody folds it in the Craft Maker.
- `npm audit` reports advisories in `brace-expansion`, reached only through ESLint's dev-time dependency tree. Resolving this requires upgrading to ESLint 10, which is a breaking change with no runtime benefit, so it has been left as-is for now.
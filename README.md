# Foldify

An origami shop and fold-tutorial site. Customers buy crafts, or they follow a tutorial for the fold.

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

Then open <http://localhost:3000>. This loads the component showcase, not a homepage — it lists every component in the design system along with the JSX needed to use it.

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
│   │   ├── page.tsx         the component showcase
│   │   ├── providers.tsx    all four contexts
│   │   ├── contexts/        Theme, Auth, Cart, Toast
│   │   ├── components/
│   │   │   ├── ui/          the closed component library — not to be edited directly
│   │   │   ├── layout/      Navbar, Footer, Container, PageHeader, AdminSidebar
│   │   │   └── showcase/    showcase-page scaffolding only
│   │   ├── lib/             api-client, mock-data, utils, hooks, cart-store
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

- Only the following endpoints are implemented: `GET /api/status`, `GET /api/auth/me`, `GET /api/products`, `GET /api/tutorials`, `GET /api/orders`, and `POST /api/contact`. All other routes are registered but return 501, with notes describing how they should be implemented.
- Texture image files have not been added yet; see `frontend/public/textures/README.md`. Surfaces render acceptably without them in the meantime.
- The Craft Maker and the fold animation player have not been started. The `CraftFile` type is a placeholder pending a separate animation spike.
- `npm audit` reports advisories in `brace-expansion`, reached only through ESLint's dev-time dependency tree. Resolving this requires upgrading to ESLint 10, which is a breaking change with no runtime benefit, so it has been left as-is for now.
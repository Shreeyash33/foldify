# Contributing to Foldify

Three people, one codebase, one semester. These rules exist so the site still
looks like one site in November.

---

## File ownership

| Area | Owner | Everyone else |
|---|---|---|
| `frontend/app/globals.css` | team lead | do not edit |
| `frontend/app/components/ui/` | team lead | consume only |
| `frontend/tailwind.config.*` | team lead | (there isn't one — Tailwind v4 is CSS-first) |
| `shared/types.ts` | agreed as a team | propose in the PR, do not change unilaterally |
| `frontend/app/(shop)/`, `(auth)/`, `learn/` | frontend dev | |
| `backend/src/` | backend dev | |
| `frontend/app/admin/` | whoever takes it | |

Editing something outside your column is not forbidden — it just needs to be
the point of the PR rather than a side effect of it.

---

## The component library is CLOSED

This is the most important rule in this document.

The team lead owns the design language. The other two build pages by assembling
components. That only works if pages **cannot** change how components look —
not accidentally, and not deliberately at 2am the night before a deadline.

### What you control

- **Content** — children, text, icons
- **`variant`, `size`, `tone`, `material`, `elevation`** — closed union types
- **Layout placement via `className`** — margin, width, `grid`/`flex`
  positioning. That is all `className` is for.

### What you do not

- ❌ **No `style` prop.** It does not exist on any component. It is not an
  oversight.
- ❌ **No colour, font, padding, radius or shadow props.** There is no
  supported route to a custom colour.
- ❌ **No Tailwind colour, padding, font or shadow utilities in page files.**
  `bg-amber-200`, `p-7`, `text-2xl` on a `<div>` in a page — no.
- ❌ **No token or theme props.**

TypeScript is the enforcement mechanism, not code review. `<Button
variant="purple">` and `<Button style={{…}}>` are both compile errors today.

### Why `className` is still allowed

Because a component cannot know where on the page it sits. Inside every
component the consumer's classes are placed **before** the component's own, so
in a conflict the design system wins the specificity tie and your stray
`bg-red-500` does nothing.

### When the library does not have what you need

Ask. Open an issue or message the lead: *"the product grid needs a card with an
image at the top."* You will get a component or a new variant, everyone else
gets it too, and the site stays coherent.

What you must not do is build it yourself in the page with raw Tailwind. That
is how a codebase ends up with four different greys and three button shapes.

**Start at [http://localhost:3000](http://localhost:3000)** — the showcase page
lists every component with the exact JSX to copy.

---

## Backend layer discipline

```
routes/       HTTP only — parse the request, validate, call something, respond
services/     business logic — no SQL, no req, no res
db/queries/   SQL only — no HTTP awareness, no business rules
```

Adding a feature means touching **one file per layer**. Not one 400-line route
file that reads the body, builds a query, calculates a total and sends an email.

Concretely:

- No `db.prepare(...)` inside `routes/`.
- No `req` or `res` inside `services/` or `db/queries/`.
- Query functions return the types from `@foldify/shared`, mapping snake_case
  columns to camelCase fields on the way out. No caller ever sees a raw row.

`db/queries/products.queries.ts` is the file to copy. Read it before writing
your first query module.

### Hard backend rules

- **No ORM.** No Prisma, Drizzle, Sequelize or TypeORM. Schema lives in
  `schema.sql`; access is through prepared statements.
- **Parameterised queries only.** Never build SQL by string interpolation.
  `WHERE slug = '${input}'` is how the whole database walks out the door.
- **Never trust a number from the client.** Prices and totals are recomputed
  server-side from the products table, always.
- **Never create routes in `frontend/app/api/`.** The backend is Express. Two
  places to look for an endpoint is one too many.

---

## Frontend rules

- **`fetch` is called in exactly one file:** `app/lib/api-client.ts`. If you
  need an endpoint, add a typed function there. Components never fetch.
- **Money is `priceMinor`, an integer in paisa.** Render it with
  `formatPrice()`. Never do arithmetic on a formatted string.
- **Honour `isLoading` from `useAuth()`.** Rendering "Sign in" while the
  session check is still in flight makes every page flicker on load.
- **Use `useToast()`** for success and failure messages. Do not build a second
  notification system.
- **`next/image` for all photography.** Never a bare `<img>`.
- **Mobile first.** Check 375px, 768px and 1440px. Nothing may scroll
  sideways at 375px. Tap targets stay at or above 44px.

### Performance budget — non-negotiable

The three of us are on older Windows laptops with integrated graphics. So:

- No `filter`, no `backdrop-filter`, no large `blur()`, no `feTurbulence`.
- At most two shadow layers per element.
- Textures are tiled images under 40KB, never one large `cover` image.
- Animate `transform` and `opacity` only. Nothing that triggers layout.
- No scroll-linked animation and no parallax.

---

## Windows

- **Node 22.** Check `node --version` before asking why an install failed.
- **No inline env vars in npm scripts.** `PORT=4000 tsx src/server.ts` fails in
  cmd.exe and PowerShell. Read config from `.env` inside the app.
- **`path.join(...)` always.** Never hand-write a `/` or `\` in a path.
- **Clone to a short path**, e.g. `C:\dev\foldify`.
- `.gitattributes` normalises line endings. Do not override it.
- `forceConsistentCasingInFileNames` is on in both tsconfigs. A file named
  `Button.tsx` imported as `./button` works on your machine and breaks on the
  build server.

---

## Branches and pull requests

```
feat/products-grid
fix/cart-quantity-clamp
chore/seed-more-products
```

- Branch from `main`. Never commit to `main` directly.
- One concern per PR. A PR that adds a feature and reformats forty files
  cannot be reviewed.
- Before opening a PR:
  ```
  npm run typecheck
  npm run lint
  npm run build
  ```
  All three must pass. A failing build on `main` blocks two other people.
- In the description say what you changed and what you deliberately left out.
- If you touched `shared/types.ts`, say so in the title — it affects both sides.

---

## Definition of done for a page

- [ ] Renders with `NEXT_PUBLIC_USE_MOCK=true` and the backend stopped
- [ ] Loading state uses `<Skeleton>`, not a blank screen
- [ ] Error state is handled — catch `ApiClientError` and show something useful
- [ ] Empty state is handled — an empty list is not an empty page
- [ ] No horizontal scroll at 375px
- [ ] Keyboard reachable, visible focus ring on everything interactive
- [ ] No raw colour, padding or font utilities anywhere in the file

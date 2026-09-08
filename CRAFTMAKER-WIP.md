# Craft Maker - WIP handoff

Branch: `craftmakerbranch`. Written at the end of a build session that ran out
of time. **This is a work-in-progress commit, not a finished feature.**

## Read this first

The build gates pass and the geometry engine is verified numerically, but
**almost none of the UI was ever exercised by a human or a browser.** No
click-through of the Craft Maker happened at any point (the browser automation
extension was not connected for the whole session). The author reported twice
that the tool did not behave correctly in use, and the second report was still
outstanding when work stopped.

Treat "typecheck/lint/build pass" as meaning *it compiles*, not *it works*.

## What is actually verified, and how

| Claim | Evidence |
|---|---|
| Fold engine conserves paper area exactly | replay harness, 40000 sq mm at every step of a 7-fold sequence |
| Mid-fold projection is correct | t=0.5 collapses the flap to a crease, as an overhead view must |
| Gesture folds land the point on the destination | 5 cases, max error 4.0e-14 |
| Crease steps leave geometry untouched | layer count and polygons byte-identical before/after |
| Layer scope leaves lower layers alone | scope=1 keeps the bottom layer byte-identical; `all` does not |
| Two faces render with different fills | rendered markup on a fresh prod server |
| Seeded fold shows both faces at every step | rasterised per step, worst step 22% minority face |
| Craft-file API round trip | create/patch/delete/restore over curl, 401 unauthenticated, 404 on unknown revision |

## What is NOT verified

- **Every interaction in the Craft Maker.** Fold picking, snapping, the live
  crease preview, vertex select/edit/delete, the draft panel, the layer-scope
  control, project deploy, history restore. All of it is compile-checked only.
- **The fold player in motion.** GSAP tween wiring, auto-play, the crease
  fold-and-return animation. The geometry each frame is derived from verified
  code, but the animation itself was never watched.
- **The canvas resize fix.** Reasoned about and changed; never seen resizing.
- Anything about how this looks. No screenshot was ever taken.

## Known-suspect areas, in the order I would check them

1. **Flip side.** Was reported broken. The diagnosis was that flipping which
   half moves mirrors the whole model across the crease (X flip on a vertical
   crease, Y flip on a horizontal one) - which is geometrically correct but
   disorienting. The fix made flipping also swap `origin`/`target` so the
   recorded gesture stays truthful. Whether that actually addresses what the
   author meant is UNCONFIRMED - it may be that they wanted valley/mountain
   (over vs under) instead, which is a different control.
2. **Layer scope defaults to `all`.** So the wings problem only goes away if
   the author sets a scope. It may need to default smarter, or to infer the
   scope from which layer was clicked.
3. **The seeded demo fold is not a crane.** It is a geometrically valid
   sequence chosen so both paper faces stay visible. The instructions attached
   to it are the real crane's seven steps, so text and animation do not
   describe the same model.
4. **`shared/types.ts` took four rounds of additions** this session
   (`origin`/`target`, `kind`, `layerScope`, `status` + `CraftFileVersion`).
   All optional except `status`. That file is team-owned per CONTRIBUTING.md
   and this diff has not been agreed with anyone.

## Gotchas that will waste your time if you do not know them

- `getTutorialShell` uses `'use cache'` with `cacheLife('hours')`. After a
  reseed the tutorial page keeps serving the OLD fold until it expires or the
  dev server restarts. The backend is the source of truth; check
  `/api/tutorials/<slug>` before believing the page.
- A fold line that does not cross the current shape is not an error anywhere.
  It folds nothing and plays as a dead frame.
- A fold that halves the shape exactly covers the stationary half, so the model
  reads as one flat colour however the faces are painted. Checking area and
  layer counts does not catch this; only counting visible faces does.
- `backend/src/db/index.ts` carries a guarded `ALTER TABLE craft_files ADD
  COLUMN status` so an existing `foldify.db` self-heals. Do not drop it.

## Layout of the new code

```
shared/types.ts                          CraftFile format + project/version types
backend/src/db/schema.sql                craft_files, craft_file_versions
backend/src/db/index.ts                  the status ALTER TABLE migration
backend/src/db/queries/craft.queries.ts  SQL
backend/src/routes/craft.routes.ts       /api/craft-files
frontend/app/lib/craft/geometry.ts       clip, reflect, bisector
frontend/app/lib/craft/fold-model.ts     THE LAYERING MODEL - read first
frontend/app/lib/craft/craft-file.ts     presets, foldFromGesture, parsing
frontend/app/components/craft/FoldStage.tsx   GSAP renderer, shared
frontend/app/admin/craft-maker/*         the authoring tool
frontend/app/learn/[slug]/FoldPlayer.tsx the public player
```

## If you need to back parts out

The feature is additive. The public player degrades to a written step list when
a tutorial has no craft file, so deleting the `craft_files` rows disables the
animation without breaking `/learn`. Reverting `frontend/app/admin/craft-maker/`
to the previous `ComingSoon` placeholder is a clean removal of the authoring
tool on its own.

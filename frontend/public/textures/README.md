# Texture files

**Status: not yet created.** Every surface in the app already looks correct
without them — `globals.css` ships CSS-gradient fallbacks for all three. These
images are an *enhancement*, layered on top. Nothing breaks while they are missing.

## Required files

| File | CSS variable | Applied to |
|---|---|---|
| `paper.webp` | `--tex-paper` | page background, cards, sheets, modals |
| `cardboard.webp` | `--tex-cardboard` | navbar, footer, sidebars, panels |
| `crumpled.webp` | `--tex-crumpled` | buttons |

Each needs a **dark variant** as well:

| File | Used when |
|---|---|
| `paper-dark.webp` | `.dark` is on `<html>` |
| `cardboard-dark.webp` | `.dark` is on `<html>` |
| `crumpled-dark.webp` | `.dark` is on `<html>` |

## Budget — all of these are hard requirements

- **Tileable.** The tile must repeat seamlessly in both directions. A visible
  seam every 256px is worse than no texture.
- **256×256 or 512×512.** Nothing larger.
- **WebP**, quality ~75.
- **Under 40KB each.** One small tile shared by forty buttons is a single
  cached texture in GPU memory. One large `cover` image per element is forty
  decodes and forty rasters, on laptops that cannot afford it.
- **Low contrast.** These sit under text. If a texture is legible on its own it
  is too strong — aim for something you notice only when you remove it.
- **Dark variants are separate images, not filtered light ones.** A dark
  overlay on a light paper texture looks like grey plastic. Photograph or
  generate the dark material directly.

## Wiring them up

One line each in `app/globals.css`. Prepend the `url()` to the existing
variable — the gradients stay as the fallback underneath:

```css
:root {
  --tex-paper:
    url("/textures/paper.webp"),
    radial-gradient(...);  /* leave the existing gradients in place */
}

.dark {
  --tex-paper:
    url("/textures/paper-dark.webp"),
    radial-gradient(...);
}
```

Swap the variable value under `.dark`. Do **not** overlay or invert.

No component file changes. That is the point of routing textures through
variables in the first place.

## What not to do

Do not reach for `filter:`, `backdrop-filter`, or an SVG `feTurbulence` to
generate texture procedurally. Filters are re-rasterised per element on every
paint; with forty product cards on integrated graphics that is a guaranteed
frame-rate problem. This rule is not negotiable — see §2.2 of the design brief.

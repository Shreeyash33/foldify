import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * shared/ ships raw TypeScript with no build step, so Next has to compile it
   * the same way it compiles app code. Without this, importing @foldify/shared
   * fails with a confusing parse error from inside node_modules.
   */
  transpilePackages: ["@foldify/shared"],

  /**
   * Partial prerendering. Each route ships a static shell and streams only the
   * parts that genuinely vary per request, so the catalogue is not re-rendered
   * for every visitor just because a price or a stock count sits next to it.
   *
   * The tradeoff: uncached dynamic data (cookies, an uncached fetch) must sit
   * inside a Suspense boundary or a `'use cache'` function, or the build fails.
   * That strictness is the point — it makes the rendering choice per route
   * explicit instead of accidental.
   */
  cacheComponents: true,

  typescript: {
    // Never let a type error through. The component library relies on the type
    // system being the enforcement mechanism, so a broken build must fail.
    ignoreBuildErrors: false,
  },

  // Note: there is no `eslint` key in Next 16 — `next lint` was removed and
  // linting runs through the ESLint CLI (`npm run lint`) instead.
};

export default nextConfig;

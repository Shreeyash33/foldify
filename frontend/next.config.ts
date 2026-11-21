import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * shared/ ships raw TypeScript with no build step, so Next has to compile it
   * the same way it compiles app code. Without this, importing @foldify/shared
   * fails with a confusing parse error from inside node_modules.
   */
  transpilePackages: ["@foldify/shared"],
  // Network dev origins: set NEXT_PUBLIC_ALLOWED_DEV_ORIGINS in .env.local
  // when a second machine needs HMR. The hostname form, e.g. ["192.168.1.50"].
  ...(process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS
    ? {
        allowedDevOrigins: process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS.split(',').map((entry) =>
          entry.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, ''),
        ),
      }
    : {}),
  /**
   * Proxy /api to the backend on the SAME origin as the page. The browser then
   * never makes a cross-origin fetch, so the session cookie is always
   * first-party: it is stored even when a second machine on the LAN opens the
   * site via the host's IP. Works for `/api` only — nothing else is rewritten.
   */
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/:path*` },
    ];
  },
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

  images: {
    /**
     * Without this, Next's image optimizer answers every /_next/image request
     * for an SVG with a 400, so the product and tutorial covers (all local
     * SVGs under /public/products) render blank on a freshly cloned repo.
     * The optimizeable source is only ever the app's own /products/*.svg —
     * nothing user-supplied reaches the optimizer — so the flag is safe here.
     */
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  typescript: {
    // Never let a type error through. The component library relies on the type
    // system being the enforcement mechanism, so a broken build must fail.
    ignoreBuildErrors: false,
  },

  // Note: there is no `eslint` key in Next 16 — `next lint` was removed and
  // linting runs through the ESLint CLI (`npm run lint`) instead.
};

export default nextConfig;

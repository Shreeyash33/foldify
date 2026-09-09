'use client';

import type { ReactNode } from 'react';

/**
 * Client-side presentation guard for the learn pages. The authorization check
 * itself is done on the server (learn-layout-content's LearnCheck), so this
 * wrapper exists only to keep the server layout Out-of-Order/instant-nav
 * friendly: it is configured with the request-time role and always renders its
 * children, never replacing them with a loading skeleton.
 */
export default function LearnGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

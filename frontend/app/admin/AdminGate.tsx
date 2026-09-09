'use client';

import type { ReactNode } from 'react';

/**
 * Client-side presentation wrapper for admin pages. The authorization check
 * is done server-side (admin-layout-content's AdminCheck); this wrapper only
 * keeps the layout instant-nav friendly by always rendering children instead of
 * replacing them with a loading skeleton.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

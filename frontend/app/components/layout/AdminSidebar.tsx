'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/app/lib/utils';
import { Badge } from '@/app/components/ui/Badge';
import { PaperSurface } from '@/app/components/ui/PaperSurface';

/**
 * STUB. Admin chrome is cardboard, like the navbar and footer.
 *
 * Structure and styling are done; the links point at pages that are still
 * placeholders. Whoever builds the admin section should extend LINKS and drop
 * this into an `app/(admin)/layout.tsx` beside the page content — probably
 * inside a ResizablePanel once the Craft Maker needs one.
 */

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/items', label: 'Items' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/craft-maker', label: 'Craft Maker' },
] as const;

export interface AdminSidebarProps {
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <PaperSurface
      as="aside"
      material="cardboard"
      elevation={1}
      className={cn(className, 'flex w-full flex-col gap-1 p-3 md:w-56')}
    >
      <span className="px-2 pb-1 font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
        Admin
      </span>

      <nav aria-label="Admin" className="flex flex-col gap-0.5">
        {LINKS.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-cut-sm)] px-3',
                'font-body text-base text-ink',
                isActive ? 'surface-paper elevation-1' : undefined,
              )}
            >
              {link.label}
              {link.href === '/admin/craft-maker' ? (
                <Badge tone="neutral" size="sm">
                  soon
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </PaperSurface>
  );
}

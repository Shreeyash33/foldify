'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart } from '@/app/contexts/CartContext';
import { cn } from '@/app/lib/utils';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { ThemeToggle } from '@/app/components/ui/ThemeToggle';
import { Container } from './Container';

/** Cardboard, with a visible cut edge along the bottom. */

const LINKS = [
  { href: '/products', label: 'Shop' },
  { href: '/learn', label: 'Learn' },
  { href: '/contact', label: 'Contact' },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { count } = useCart();
  /**
   * The drawer must close when the route changes, or it stays open on top of
   * the page you just navigated to.
   *
   * Done by adjusting state during render rather than in an effect: the
   * pathname it was opened at is stored alongside it, and a mismatch resets it
   * before anything paints. An effect would render the drawer open over the
   * new page for one frame first.
   * https://react.dev/learn/you-might-not-need-an-effect
   */
  const [drawer, setDrawer] = useState({ isOpen: false, path: pathname });

  if (drawer.isOpen && drawer.path !== pathname) {
    setDrawer({ isOpen: false, path: pathname });
  }

  const isDrawerOpen = drawer.isOpen && drawer.path === pathname;
  const toggleDrawer = () => setDrawer((current) => ({ isOpen: !current.isOpen, path: pathname }));

  return (
    <PaperSurface
      as="header"
      material="cardboard"
      elevation={2}
      className="sticky top-0 z-40 w-full rounded-none border-x-0 border-t-0"
    >
      <Container width="wide" className="flex min-h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-xl text-ink"
          aria-label="Foldify home"
        >
          <FoldMark />
          Foldify
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} isActive={pathname.startsWith(link.href)}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />

          <Link
            href="/cart"
            aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            className="relative flex size-11 items-center justify-center rounded-[var(--radius-cut-sm)] text-ink"
          >
            <CartMark />
            {count > 0 ? (
              <Badge tone="accent" size="sm" className="absolute -top-0.5 -right-0.5">
                {count}
              </Badge>
            ) : null}
          </Link>

          {/* isLoading is honoured: never flash a signed-out state on load. */}
          <div className="hidden md:flex md:items-center md:gap-2">
            {isLoading ? (
              <span className="h-9 w-20 animate-pulse rounded-[var(--radius-cut-sm)] bg-paper-sunken" />
            ) : user === null ? (
              <Button href="/login" variant="ghost" size="sm">
                Sign in
              </Button>
            ) : (
              <Button href="/profile" variant="ghost" size="sm">
                {user.name.split(' ')[0]}
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleDrawer}
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-drawer"
            aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
            className="flex size-11 items-center justify-center rounded-[var(--radius-cut-sm)] text-ink md:hidden"
          >
            <HamburgerMark isOpen={isDrawerOpen} />
          </button>
        </div>
      </Container>

      {/* Slide-in drawer, below md only. Height/opacity rather than a portal —
          it is part of the header and should scroll away with it. */}
      <div
        id="mobile-drawer"
        hidden={!isDrawerOpen}
        className="border-t border-cardboard-edge md:hidden"
      >
        <Container width="wide" className="flex flex-col gap-1 py-3">
          <nav aria-label="Mobile" className="flex flex-col">
            {LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} isActive={pathname.startsWith(link.href)}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {isLoading ? null : user === null ? (
            <Button href="/login" variant="secondary" size="sm" fullWidth className="mt-2">
              Sign in
            </Button>
          ) : (
            <Button href="/profile" variant="secondary" size="sm" fullWidth className="mt-2">
              {user.name}
            </Button>
          )}
        </Container>
      </div>
    </PaperSurface>
  );
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center rounded-[var(--radius-cut-sm)] px-3 font-body text-base',
        isActive ? 'text-ink underline decoration-2 underline-offset-8' : 'text-ink',
      )}
    >
      {children}
    </Link>
  );
}

/** A folded square — the logo mark. */
function FoldMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 text-ink">
      <path
        d="M4 4h11l5 5v11H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M15 4v5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CartMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        d="M3 5h2l2.2 9.2a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 1.9-1.4L20 8H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

function HamburgerMark({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      {isOpen ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

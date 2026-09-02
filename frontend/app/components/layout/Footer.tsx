import Link from 'next/link';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { Container } from './Container';

/** Cardboard, with the cut edge along the top this time. */

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { href: '/products', label: 'All products' },
      { href: '/cart', label: 'Cart' },
      { href: '/checkout', label: 'Checkout' },
    ],
  },
  {
    heading: 'Learn',
    links: [{ href: '/learn', label: 'Tutorials' }],
  },
  {
    heading: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/register', label: 'Create account' },
      { href: '/profile', label: 'Profile' },
    ],
  },
] as const;

export function Footer() {
  return (
    <PaperSurface
      as="footer"
      material="cardboard"
      elevation={0}
      className="mt-16 w-full rounded-none border-x-0 border-t-[3px] border-b-0"
    >
      <Container width="wide" className="flex flex-col gap-8 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span className="font-display text-lg text-ink">Foldify</span>
            <p className="font-body text-sm text-ink-muted">
              Folded origami, with the tutorials that teach the same folds.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-2">
              <span className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
                {column.heading}
              </span>
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-body text-sm text-ink underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <p className="font-mono text-xs text-ink-muted">
          BSc CSIT semester project · built with Next.js, Express and SQLite
        </p>
      </Container>
    </PaperSurface>
  );
}

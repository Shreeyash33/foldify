import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Container } from '@/app/components/layout/Container';
import { CreaseDivider } from '@/app/components/ui/CreaseDivider';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { Button } from '@/app/components/ui/Button';
import { FeaturedProducts, FeaturedProductsSkeleton } from '@/app/components/home/FeaturedProducts';

export const metadata: Metadata = {
  title: 'Folded origami and fold tutorials',
};

/**
 * The marketing landing page.
 *
 * A static hero shell (the headline, the two calls to action) is prerendered,
 * and only the featured strip depends on the catalogue, so that single piece
 * renders client-side (with a skeleton) while the rest of the page stays
 * static. Links lead into the shop and the tutorials.
 */
export default function HomePage() {
  return (
    <>
      <SectionHero />

      <Container width="wide" className="flex flex-col gap-8 pb-16 pt-5">
        <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
                Featured
              </span>
              <h2 id="featured-heading" className="font-display text-2xl text-ink">
                Off the shelf this week
              </h2>
            </div>
            <Button href="/products" variant="secondary" size="sm">
              View all products
            </Button>
          </div>

          <Suspense fallback={<FeaturedProductsSkeleton />}>
            <FeaturedProducts />
          </Suspense>
        </section>

        <CreaseDivider variant="mountain" />

        <section aria-labelledby="learn-heading" className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
                Learn
              </span>
              <h2 id="learn-heading" className="font-display text-2xl text-ink">
                Prefer to fold it yourself?
              </h2>
              <p className="max-w-2xl font-body text-base text-ink-muted">
                Every fold we sell is also a step-by-step tutorial - the same
                crane, rated the same difficulty. Pick a craft from the shop, or
                start from a fold and make it yourself.
              </p>
            </div>
            <Button href="/learn" variant="primary">
              Browse the tutorials
            </Button>
          </div>
        </section>
      </Container>
    </>
  );
}

/** The top banner: folded square mark, headline, and the two main calls to action. */
function SectionHero() {
  return (
    <PaperSurface material="cardboard" elevation={0} className="rounded-none border-x-0 border-t-0">
      <Container width="wide" className="flex flex-col gap-6 py-10 sm:py-14">
        <Link href="/products" className="inline-flex w-fit">
          <PaperSurface material="crumpled" elevation={1} className="p-2">
            <Mark />
          </PaperSurface>
        </Link>

        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
            Foldify — folded origami
          </span>
          <h1 className="max-w-3xl font-display text-4xl text-ink sm:text-5xl">
            A crane you can buy, or the fold you learn to make your own.
          </h1>
          <p className="max-w-2xl font-body text-base text-ink-muted">
            Hand-folded origami animals, flowers, modulars and vessels — each
            one with a step-by-step tutorial for the same fold, rated the same
            difficulty. Buy the finished craft, or fold it yourself.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button href="/products" size="lg">
            Browse the shop
          </Button>
          <Button href="/learn" variant="secondary" size="lg">
            Learn a fold
          </Button>
        </div>
      </Container>
    </PaperSurface>
  );
}

/** The folded-square mark, reused from the design-system showcase vocabulary. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-12 text-ink">
      <path
        d="M4 4h11l5 5v11H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15 4l5 5h-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
          </Specimen>
        </SpecimenGrid>
      </Section>

      {/* ------------------------------------------------------------- Tabs */}
      <Section
        id="tabs"
        title="Tabs"
        importPath="import { Tabs } from '@/app/components/ui/Tabs';"
        description="Controlled or uncontrolled. Arrow keys move between tabs, Home and End jump to the ends, and only the active tab is in the tab order."
      >
        <PaperSurface material="paper" elevation={1} className="p-4 sm:p-5">
          <Tabs
            defaultValue="description"
            items={[
              {
                value: 'description',
                label: 'Description',
                content: (
                  <p className="font-body text-ink">
                    Single-sided kami in a hundred colours. The default paper for practice: cheap
                    enough to waste, crisp enough to hold a crease.
                  </p>
                ),
              },
              {
                value: 'specs',
                label: 'Specs',
                content: (
                  <dl className="grid grid-cols-2 gap-2 font-mono text-sm text-ink">
                    <dt className="text-ink-muted">size</dt>
                    <dd>150 × 150 mm</dd>
                    <dt className="text-ink-muted">weight</dt>
                    <dd>70 gsm</dd>
                    <dt className="text-ink-muted">sheets</dt>
                    <dd>100</dd>
                  </dl>
                ),
              },
              {
                value: 'reviews',
                label: 'Reviews',
                content: <p className="font-body text-ink-muted">No reviews yet.</p>,
              },
              { value: 'disabled', label: 'Disabled', content: null, disabled: true },
            ]}
          />
        </PaperSurface>
      </Section>

      {/* ---------------------------------------------------- CreaseDivider */}
      <Section
        id="crease-divider"
        title="CreaseDivider"
        importPath="import { CreaseDivider } from '@/app/components/ui/CreaseDivider';"
        description="The signature element, drawn in genuine origami notation: dashed for a valley fold, dash-dot for a mountain fold, with an optional direction arrow. Pure SVG — no image, no filter."
      >
        <PaperSurface material="paper" elevation={1} className="px-5 py-2">
          <CreaseDivider variant="valley" />
          <CreaseDivider variant="valley" label="valley fold" />
          <CreaseDivider variant="mountain" />
          <CreaseDivider variant="mountain" label="mountain fold" withArrow />
        </PaperSurface>

        <PaperSurface material="sunken" className="overflow-x-auto p-3">
          <code className="block font-mono text-xs whitespace-pre text-ink-muted">
            {`<CreaseDivider variant="valley" />
<CreaseDivider variant="mountain" label="mountain fold" withArrow />`}
          </code>
        </PaperSurface>
      </Section>

      {/* -------------------------------------------------- ResizablePanel */}
      <Section
        id="resizable-panel"
        title="ResizablePanel"
        importPath="import { ResizablePanel } from '@/app/components/ui/ResizablePanel';"
        description="Drag the crease, or focus it and use the arrow keys — Home and End jump to the limits. Below md it stacks and resizing switches off entirely; a horizontal resizer on a 375px screen is not a feature. This becomes the Craft Maker's canvas/controls split later."
      >
        <PaperSurface material="paper" elevation={1} className="p-2">
          <ResizablePanel
            label="Resize the demo panels"
            defaultSize={50}
            minSize={25}
            maxSize={75}
            onResize={setPanelSize}
            className="h-64"
            first={
              <PaperSurface
                material="sunken"
                className="flex h-full items-center justify-center p-4"
              >
                <span className="font-mono text-sm text-ink-muted">
                  canvas  {Math.round(panelSize)}%
                </span>
              </PaperSurface>
            }
            second={
              <PaperSurface
                material="sunken"
                className="flex h-full items-center justify-center p-4"
              >
                <span className="font-mono text-sm text-ink-muted">controls</span>
              </PaperSurface>
            }
          />
        </PaperSurface>

        <PaperSurface material="sunken" className="overflow-x-auto p-3">
          <code className="block font-mono text-xs whitespace-pre text-ink-muted">
            {`<ResizablePanel
  direction="horizontal"
  defaultSize={50}
  minSize={25}
  maxSize={75}
  onResize={setSize}
  first={<Canvas />}
  second={<Controls />}
/>`}
          </code>
        </PaperSurface>
      </Section>

      {/* -------------------------------------------------------- the rules */}
      <Section
        id="rules"
        title="House rules"
        importPath="the full version lives in CONTRIBUTING.md"
        description="The component library is closed. These are the rules that keep it that way."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>You control</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="flex list-disc flex-col gap-1 pl-5 font-body text-ink">
                <li>Content and children</li>
                <li>
                  <code className="font-mono text-xs">variant</code>,{' '}
                  <code className="font-mono text-xs">size</code>,{' '}
                  <code className="font-mono text-xs">tone</code>,{' '}
                  <code className="font-mono text-xs">material</code>,{' '}
                  <code className="font-mono text-xs">elevation</code>
                </li>
                <li>
                  Layout placement via <code className="font-mono text-xs">className</code> — margin,
                  width, grid and flex only
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>You do not</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="flex list-disc flex-col gap-1 pl-5 font-body text-ink">
                <li>
                  No <code className="font-mono text-xs">style</code> prop, anywhere
                </li>
                <li>No colour, font, padding, radius or shadow props</li>
                <li>No Tailwind colour or padding utilities in page files</li>
                <li>
                  No edits to <code className="font-mono text-xs">globals.css</code>,{' '}
                  <code className="font-mono text-xs">app/components/ui/</code> or{' '}
                  <code className="font-mono text-xs">shared/</code>
                </li>
                <li>Need something new? Ask for a component or a variant.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </Section>

      <div className="pb-16" />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Delete this product?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setIsModalOpen(false);
                toast.success('Nothing was deleted — this is a demo.');
              }}
            >
              Delete
            </Button>
          </>
        }
      >
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

'use client';

import { useState } from 'react';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardMeta,
  CardTitle,
} from '@/app/components/ui/Card';
import { Checkbox } from '@/app/components/ui/Checkbox';
import { CreaseDivider } from '@/app/components/ui/CreaseDivider';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { ResizablePanel } from '@/app/components/ui/ResizablePanel';
import { Select } from '@/app/components/ui/Select';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { Spinner } from '@/app/components/ui/Spinner';
import { Switch } from '@/app/components/ui/Switch';
import { Tabs } from '@/app/components/ui/Tabs';
import { Textarea } from '@/app/components/ui/Textarea';
import { ThemeToggle } from '@/app/components/ui/ThemeToggle';
import { Section, Specimen, SpecimenGrid } from '@/app/components/showcase/Section';
import { StatusPanel } from '@/app/components/showcase/StatusPanel';
import { useToast } from '@/app/contexts/ToastContext';
import { formatPrice } from '@/app/lib/utils';

/**
 * NOT A HOMEPAGE — a living style guide.
 *
 * Every component in sequence, every variant, every size, every state, in both
 * materials, with the palette as swatches and the type scale as specimens.
 * Each section carries its import path and the exact JSX to copy.
 *
 * This page is how the team learns the library, and it is what stops anyone
 * going off to find a CSS tutorial and inventing a second design language.
 * Keep it current: a component that is not on this page does not exist as far
 * as your teammates are concerned.
 */

const SWATCHES = [
  { token: 'paper', use: 'page background' },
  { token: 'paper-raised', use: 'cards, sheets, modals' },
  { token: 'paper-sunken', use: 'inputs, wells' },
  { token: 'cardboard', use: 'navbar, footer, panels' },
  { token: 'cardboard-edge', use: 'cardboard borders, cut edges' },
  { token: 'ink', use: 'primary text' },
  { token: 'ink-muted', use: 'secondary text' },
  { token: 'indigo', use: 'primary action, links' },
  { token: 'beni', use: 'destructive' },
  { token: 'crease', use: 'fold lines, dividers' },
] as const;

/** Tailwind only generates classes it can see in full, so the map is explicit. */
const SWATCH_CLASS: Record<(typeof SWATCHES)[number]['token'], string> = {
  paper: 'bg-paper',
  'paper-raised': 'bg-paper-raised',
  'paper-sunken': 'bg-paper-sunken',
  cardboard: 'bg-cardboard',
  'cardboard-edge': 'bg-cardboard-edge',
  ink: 'bg-ink',
  'ink-muted': 'bg-ink-muted',
  indigo: 'bg-indigo',
  beni: 'bg-beni',
  crease: 'bg-crease',
};

export default function ShowcasePage() {
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSwitchOn, setIsSwitchOn] = useState(true);
  const [isChecked, setIsChecked] = useState(true);
  const [panelSize, setPanelSize] = useState(50);

  return (
    <Container width="wide">
      <PageHeader
        eyebrow="Foldify design system"
        title="Component showcase"
        description="Every component in the library, with the JSX to copy. Paper and cardboard, and nothing else. If a page needs something that is not here, ask for it rather than improvising."
        actions={
          <>
            <ThemeToggle />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.info('Toasts look like this.')}
            >
              Test a toast
            </Button>
          </>
        }
      />

      <StatusPanel />

      {/* ---------------------------------------------------------- palette */}
      <Section
        id="palette"
        title="Palette"
        importPath="tokens defined in app/globals.css — never a hex literal in a page file"
        description="Two materials, ten tokens, and a dark mode that is a re-tune rather than an inversion. Use the Tailwind class (bg-indigo, text-ink-muted); the value swaps itself when the theme changes."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map((swatch) => (
            <PaperSurface key={swatch.token} material="paper" elevation={1} className="p-3">
              <span
                className={`block h-12 w-full rounded-[var(--radius-cut-sm)] border border-crease ${SWATCH_CLASS[swatch.token]}`}
              />
              <code className="mt-2 block font-mono text-xs break-all text-ink">
                {swatch.token}
              </code>
              <span className="block font-body text-xs text-ink-muted">{swatch.use}</span>
            </PaperSurface>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------- typography */}
      <Section
        id="typography"
        title="Type scale"
        importPath="font-display  font-body  font-mono"
        description="Fraunces for display, Karla for body, JetBrains Mono for anything technical — step numbers, labels, prices and data. The mono face is a real choice, not a default: origami instructions are diagrams."
      >
        <PaperSurface material="paper" elevation={1} className="flex flex-col gap-4 p-5">
          <TypeRow label="font-display  3xl">
            <p className="font-display text-3xl text-ink">The traditional crane</p>
          </TypeRow>
          <TypeRow label="font-display  xl">
            <p className="font-display text-xl text-ink">Fold the lower edges to the centre</p>
          </TypeRow>
          <TypeRow label="font-body  base">
            <p className="font-body text-base text-ink">
              Start coloured side up. Fold in half along both diagonals and unfold, then turn the
              paper over and repeat horizontally and vertically.
            </p>
          </TypeRow>
          <TypeRow label="font-body  sm  ink-muted">
            <p className="font-body text-sm text-ink-muted">
              Textured Japanese tant with a faint tooth. Holds wet-folded curves without cracking.
            </p>
          </TypeRow>
          <TypeRow label="font-mono  xs  uppercase">
            <p className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
              Step 04  mountain fold
            </p>
          </TypeRow>
          <TypeRow label="font-mono  price">
            <p className="font-mono text-base text-ink">{formatPrice(92000)}</p>
          </TypeRow>
        </PaperSurface>
      </Section>

      {/* ----------------------------------------------------- PaperSurface */}
      <Section
        id="paper-surface"
        title="PaperSurface"
        importPath="import { PaperSurface } from '@/app/components/ui/PaperSurface';"
        description="The base of everything. Owns the texture, shadow, highlight, border and radius recipe — every other surface composes it rather than re-implementing it."
      >
        <SpecimenGrid>
          <Specimen
            label="materials"
            code={`<PaperSurface material="paper" />
<PaperSurface material="cardboard" />
<PaperSurface material="crumpled" />
<PaperSurface material="sunken" />`}
          >
            {(['paper', 'cardboard', 'crumpled', 'sunken'] as const).map((material) => (
              <PaperSurface key={material} material={material} className="px-4 py-6">
                <code className="font-mono text-xs text-ink">{material}</code>
              </PaperSurface>
            ))}
          </Specimen>

          <Specimen label="elevation 0 – 3" code={`<PaperSurface elevation={0 | 1 | 2 | 3} />`}>
            {([0, 1, 2, 3] as const).map((elevation) => (
              <PaperSurface
                key={elevation}
                material="paper"
                elevation={elevation}
                className="px-4 py-6"
              >
                <code className="font-mono text-xs text-ink">{elevation}</code>
              </PaperSurface>
            ))}
          </Specimen>
        </SpecimenGrid>
      </Section>

      {/* ----------------------------------------------------------- Button */}
      <Section
        id="button"
        title="Button"
        importPath="import { Button } from '@/app/components/ui/Button';"
        description="Crumpled paper; pressing compresses the depth. There is no colour, padding or style prop — variant and size are closed unions, so anything outside the system is a TypeScript error rather than a review comment."
      >
        <SpecimenGrid>
          <Specimen
            label="variants"
            code={`<Button variant="primary">Add to cart</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Skip</Button>
<Button variant="danger">Delete</Button>`}
          >
            <Button variant="primary">Add to cart</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="danger">Delete</Button>
          </Specimen>

          <Specimen label="sizes" code={`<Button size="sm" | "md" | "lg">Fold</Button>`}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Specimen>

          <Specimen
            label="states"
            code={`<Button disabled>Out of stock</Button>
<Button isLoading>Saving</Button>`}
          >
            <Button disabled>Out of stock</Button>
            <Button isLoading>Saving</Button>
            <Button variant="danger" disabled>
              Delete
            </Button>
            <Button variant="secondary" isLoading>
              Loading
            </Button>
          </Specimen>

          <Specimen
            label="icons and full width"
            code={`<Button leftIcon={<Mark />}>With icon</Button>
<Button fullWidth>Checkout</Button>`}
          >
            <Button leftIcon={<Mark />}>With icon</Button>
            <Button rightIcon={<Mark />} variant="secondary">
              Trailing
            </Button>
            <Button fullWidth onClick={() => toast.success('That worked.')}>
              Full width
            </Button>
          </Specimen>
        </SpecimenGrid>
      </Section>

      {/* ------------------------------------------------------------- Card */}
      <Section
        id="card"
        title="Card"
        importPath="import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardMeta } from '@/app/components/ui/Card';"
        description="A sheet of raised paper. Padding lives in the parts, so a card can hold a full-bleed image at the top and still keep its text inset."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tant 150mm — Muted</CardTitle>
              <CardMeta>48 sheets  origami paper</CardMeta>
            </CardHeader>
            <CardBody>
              <p className="font-body text-sm text-ink-muted">
                Textured Japanese tant with a faint tooth. Holds wet-folded curves without cracking.
              </p>
            </CardBody>
            <CardFooter>
              <span className="font-mono text-base text-ink">{formatPrice(92000)}</span>
              <Badge tone="neutral">intermediate</Badge>
              <Button size="sm" className="ml-auto">
                Add
              </Button>
            </CardFooter>
          </Card>

          <Card material="cardboard" elevation={2}>
            <CardHeader>
              <CardTitle>Cardboard card</CardTitle>
              <CardMeta>For structural chrome and panels</CardMeta>
            </CardHeader>
            <CardBody>
              <p className="font-body text-sm text-ink">
                Same component, different material. Cardboard frames content; paper is content.
              </p>
            </CardBody>
          </Card>

          <Card interactive elevation={2}>
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardMeta>Hover and press respond</CardMeta>
            </CardHeader>
            <CardBody>
              <p className="font-body text-sm text-ink-muted">
                Only set <code className="font-mono text-xs">interactive</code> when the whole card
                is a link or a button — otherwise it promises something it cannot do.
              </p>
            </CardBody>
          </Card>
        </div>
      </Section>

      {/* ------------------------------------------------------------ Badge */}
      <Section
        id="badge"
        title="Badge"
        importPath="import { Badge } from '@/app/components/ui/Badge';"
        description="Small mono label — difficulty, stock, order status, counts."
      >
        <Specimen
          label="tones and sizes"
          code={`<Badge tone="neutral" | "accent" | "danger" | "cardboard" size="sm" | "md" />`}
        >
          <Badge tone="neutral">beginner</Badge>
          <Badge tone="accent">paid</Badge>
          <Badge tone="danger">cancelled</Badge>
          <Badge tone="cardboard">kits</Badge>
          <Badge tone="accent" size="sm">
            12
          </Badge>
        </Specimen>
      </Section>

      {/* --------------------------------------------------- form controls */}
      <Section
        id="forms"
        title="Form controls"
        importPath="import { Input, Textarea, Select, Checkbox, Switch } from '@/app/components/ui/…';"
        description="Sunken paper, shadow inverted. Label association is handled inside the component, so it cannot be forgotten."
      >
        <SpecimenGrid>
          <Specimen
            label="Input — default, hint, error, disabled"
            code={`<Input label="Email" type="email" />
<Input label="Full name" hint="As it should appear on the parcel." required />
<Input label="Email" error="That does not look like an email." />`}
          >
            <div className="flex w-full flex-col gap-4">
              <Input label="Email" type="email" placeholder="you@example.com" />
              <Input label="Full name" hint="As it should appear on the parcel." required />
              <Input
                label="Email"
                defaultValue="not-an-email"
                error="That does not look like an email."
              />
              <Input label="Coupon" defaultValue="FOLD10" disabled />
              <Input label="Search" placeholder="Search products" leftIcon={<Mark />} />
            </div>
          </Specimen>

          <Specimen
            label="Textarea, Select, Checkbox, Switch"
            code={`<Textarea label="Message" rows={3} />
<Select label="Difficulty" options={…} />
<Checkbox label="Email me about new kits" />
<Switch label="Dark mode" checked={on} onCheckedChange={setOn} />`}
          >
            <div className="flex w-full flex-col gap-4">
              <Textarea label="Message" rows={3} placeholder="Tell us what you are folding." />
              <Select
                label="Difficulty"
                placeholder="Any difficulty"
                defaultValue=""
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
              />
              <Checkbox
                label="Email me about new kits"
                checked={isChecked}
                onChange={(event) => setIsChecked(event.target.checked)}
              />
              <Checkbox label="Disabled option" disabled />
              <Switch label="Switch, on" checked={isSwitchOn} onCheckedChange={setIsSwitchOn} />
              <Switch
                label="Switch, disabled"
                checked={false}
                onCheckedChange={() => undefined}
                disabled
              />
            </div>
          </Specimen>
        </SpecimenGrid>
      </Section>

      {/* --------------------------------------------------------- feedback */}
      <Section
        id="feedback"
        title="Feedback"
        importPath="import { Spinner, Skeleton, Modal } from '@/app/components/ui/…'; import { useToast } from '@/app/contexts/ToastContext';"
        description="Skeletons for content that is loading, a spinner for an action in flight, toasts for something that has already happened."
      >
        <SpecimenGrid>
          <Specimen label="Spinner" code={`<Spinner size="sm" | "md" | "lg" />`}>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </Specimen>

          <Specimen
            label="Skeleton"
            code={`<Skeleton shape="title" />
<Skeleton shape="text" lines={3} />
<Skeleton shape="block" />`}
          >
            <div className="flex w-full flex-col gap-3">
              <Skeleton shape="title" />
              <Skeleton shape="text" lines={3} />
              <Skeleton shape="block" />
            </div>
          </Specimen>

          <Specimen
            label="Toasts"
            code={`const toast = useToast();
toast.success('Saved.');
toast.error('That did not work.');
toast.info('Heads up.');`}
          >
            <Button size="sm" onClick={() => toast.success('Added to cart.')}>
              success
            </Button>
            <Button size="sm" variant="danger" onClick={() => toast.error('That email is taken.')}>
              error
            </Button>
            <Button size="sm" variant="secondary" onClick={() => toast.info('Two sheets left.')}>
              info
            </Button>
          </Specimen>

          <Specimen
            label="Modal"
            code={`<Modal isOpen={open} onClose={close} title="Delete product" footer={…}>
  …
</Modal>`}
          >
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Open modal
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
          <p className="font-body text-ink">
            Deleting is a soft delete: the product is unpublished rather than removed, because past
            orders still reference it.
          </p>
          <p className="font-body text-sm text-ink-muted">
            Escape closes this. So does clicking the backdrop. Tab is trapped inside the dialog, and
            focus returns to the button that opened it.
          </p>
          <Input label="Type the product name to confirm" placeholder="Tant 150mm — Muted" />
        </div>
      </Modal>
    </Container>
  );
}

/** Local helper for the type-scale rows. Showcase-only. */
function TypeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-crease pb-3 last:border-b-0 last:pb-0">
      <span className="font-mono text-[0.625rem] tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

/** A folded square, standing in for a real icon set. */
function Mark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path
        d="M3 3h7l3 3v7H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 3v3h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

'use client';

import type { ReactNode } from 'react';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { CreaseDivider } from '@/app/components/ui/CreaseDivider';

/**
 * Showcase-only scaffolding. Not part of the component library — nothing
 * outside app/page.tsx should import from this folder.
 *
 * Each section states the import path and the exact JSX to copy, because the
 * showcase is how the team learns the library. If they have to read the
 * source to work out the props, it has not done its job.
 */

export function Section({
  id,
  title,
  importPath,
  description,
  children,
}: {
  id: string;
  title: string;
  importPath: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <CreaseDivider variant="valley" label={title} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <code className="font-mono text-xs break-all text-ink-muted">{importPath}</code>
          {description !== undefined ? (
            <p className="max-w-2xl font-body text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>

        {children}
      </div>
    </section>
  );
}

/** A labelled specimen with the JSX that produced it. */
export function Specimen({
  label,
  code,
  children,
}: {
  label: string;
  code?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </span>

      <PaperSurface material="paper" elevation={1} className="p-4">
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      </PaperSurface>

      {code !== undefined ? (
        <PaperSurface material="sunken" className="overflow-x-auto p-3">
          <code className="block font-mono text-xs whitespace-pre text-ink-muted">{code}</code>
        </PaperSurface>
      ) : null}
    </div>
  );
}

/** Responsive grid for specimens. One column at 375px, always. */
export function SpecimenGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">{children}</div>;
}

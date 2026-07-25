'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/lib/utils';
import { Spinner } from './Spinner';

/**
 * Crumpled paper. Pressing compresses the depth — that press is the entire
 * personality of this design system, so it lives on the most-used component.
 *
 * CLOSED COMPONENT. There is no `style` prop, no colour prop, no padding prop,
 * no token prop. `variant` and `size` are closed unions, so passing anything
 * outside the system is a TypeScript error rather than a code review comment.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style' | 'color'
>;

export interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  /**
   * Turns the button into a link. An internal path renders `next/link` for
   * client-side routing; anything starting with `http` or `mailto:` renders a
   * plain anchor.
   *
   * Note there is deliberately no `as={SomeComponent}` escape hatch: a
   * component passed as a prop cannot cross the server/client boundary, and
   * the resulting build error ("Functions cannot be passed directly to Client
   * Components") is not one anybody should have to debug twice.
   */
  href?: string;
  /** For external links — `_blank` adds the usual rel automatically. */
  target?: '_blank';
  children?: ReactNode;
  /**
   * LAYOUT ONLY — margin, width, grid/flex placement.
   * Not for colour, padding, font, radius or shadow.
   */
  className?: string;
}

/**
 * Every variant sets its colour with Tailwind UTILITIES, never with another
 * `.surface-*` class. Two surface classes on one element do not resolve by the
 * order you write them in `className` — CSS uses stylesheet source order, so
 * `.surface-crumpled` (declared later in globals.css) would silently win and
 * a cardboard button would render white. Utilities sit in a later layer than
 * components, so they beat the base material every time.
 *
 * The crumpled TEXTURE still comes from `.surface-crumpled` on the base class;
 * only the colour is overridden here.
 *
 * Hover is a translucent overlay from `.pressable`, never `filter: brightness()`
 * — filters re-rasterise on every paint and §2.7 rules them out entirely.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-indigo text-on-fill border-indigo',
  secondary: 'bg-cardboard text-ink border-cardboard-edge',
  ghost: 'bg-transparent text-ink border-transparent hover:border-crease',
  danger: 'bg-beni text-on-fill border-beni',
};

const SIZE: Record<ButtonSize, string> = {
  // min-h keeps every tap target at or above 44px on touch screens.
  sm: 'min-h-[2.25rem] px-3 py-1.5 text-sm gap-1.5',
  md: 'min-h-[2.75rem] px-4 py-2 text-base gap-2',
  lg: 'min-h-[3.25rem] px-6 py-3 text-lg gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  href,
  target,
  children,
  className,
  disabled,
  type,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled === true || isLoading;

  const classes = cn(
    // Consumer classes first so they lose every conflict with the system.
    className,
    'surface-crumpled pressable inline-flex items-center justify-center border font-body font-medium select-none',
    'rounded-[var(--radius-cut-sm)]',
    VARIANT[variant],
    SIZE[size],
    fullWidth ? 'w-full' : undefined,
    isDisabled ? 'cursor-not-allowed opacity-55' : 'elevation-1 cursor-pointer',
  );

  const inner = (
    <>
      {isLoading ? <Spinner size={size === 'lg' ? 'md' : 'sm'} /> : leftIcon}
      {children}
      {isLoading ? null : rightIcon}
    </>
  );

  if (href !== undefined) {
    const isExternal = /^(https?:|mailto:|tel:)/.test(href);

    if (isExternal || target === '_blank') {
      return (
        <a
          href={href}
          target={target}
          // Without noopener the new tab can reach back through window.opener.
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          aria-disabled={isDisabled || undefined}
          className={classes}
        >
          {inner}
        </a>
      );
    }

    return (
      <Link href={href} aria-disabled={isDisabled || undefined} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      // A native <button> defaults to type="submit", which silently submits
      // any form it happens to sit inside. Default to "button" instead.
      type={type ?? 'button'}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={classes}
      {...rest}
    >
      {inner}
    </button>
  );
}

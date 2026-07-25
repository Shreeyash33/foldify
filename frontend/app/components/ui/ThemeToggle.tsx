'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import { useIsHydrated } from '@/app/lib/hooks';
import { cn } from '@/app/lib/utils';

/**
 * A physical-feeling switch, not a bare icon button: a paper tab that slides
 * along a sunken cardboard channel, with the sun and moon printed on the
 * track behind it so the destination is visible before you press.
 *
 * Only `transform` animates.
 *
 * HYDRATION: the knob position comes from the `dark:` CSS variant, not from
 * React state. The pre-paint script in layout.tsx has already put `.dark` on
 * <html>, so CSS gets the knob right before React exists and the server and
 * client render byte-identical markup.
 *
 * The ARIA attributes cannot be done in CSS, so they wait for `useIsHydrated()`
 * and settle immediately after hydration. Deriving them from state directly
 * would make the server say `aria-checked="false"` and the client say `true` —
 * exactly the mismatch React refuses to patch up.
 */

export interface ThemeToggleProps {
  /** LAYOUT ONLY — margin, width, grid/flex placement. */
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isHydrated = useIsHydrated();

  const isDark = isHydrated && theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={cn(
        className,
        'surface-sunken relative flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full px-1',
      )}
    >
      {/* Track markings. The tab slides over whichever one is not active. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5 text-ink-muted"
      >
        <SunMark />
        <MoonMark />
      </span>

      {/* Position is pure CSS — identical markup on server and client. */}
      <span
        aria-hidden="true"
        className={cn(
          'surface-crumpled elevation-1 relative size-6 rounded-full border border-crease',
          'transition-transform duration-150 ease-[var(--ease-fold)]',
          'translate-x-0 dark:translate-x-6',
        )}
      />
    </button>
  );
}

function SunMark() {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
      <circle cx="6" cy="6" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6 0.8v1.4M6 9.8v1.4M0.8 6h1.4M9.8 6h1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonMark() {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
      <path
        d="M9.5 7.2A4 4 0 0 1 4.8 2.5 4 4 0 1 0 9.5 7.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

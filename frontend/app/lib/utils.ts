/**
 * The whole utility belt. Twenty lines beats two dependencies.
 */

/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately NOT clsx + tailwind-merge. Conflict resolution is handled by
 * ordering instead: every component places consumer `className` BEFORE its own
 * classes, so the component's colours and padding win the specificity tie and
 * a teammate cannot accidentally restyle the design system. See §3.4.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Money is stored and passed around in minor units (paisa) as an integer.
 * Only this function turns it into something a person reads.
 */
export function formatPrice(minorUnits: number, currency: 'NPR' = 'NPR'): string {
  return formatMoney(minorUnits, { prefix: currency === 'NPR' ? 'Rs ' : `${currency} ` });
}

export interface FormatMoneyOptions {
  /** 0, 1 or 2 decimal places. Defaults to 2 (paisa → rupees). */
  fractionDigits?: 0 | 1 | 2;
  /** Text before the number, e.g. "Rs. ". Default "". */
  prefix?: string;
  /** Text after the number, e.g. " spent". Default "". */
  suffix?: string;
}

/**
 * The single money formatter. Every price in the app — shop, cart, admin —
 * goes through here so paisa renders identically everywhere: `en-NP` grouping
 * (lakh/crore) with a caller-controlled prefix, decimals and suffix. Admin no
 * longer keeps its own local copies with a different locale.
 */
export function formatMoney(minorUnits: number, options: FormatMoneyOptions = {}): string {
  const { fractionDigits = 2, prefix = '', suffix = '' } = options;
  const major = minorUnits / 100;
  const formatted = major.toLocaleString('en-NP', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${prefix}${formatted}${suffix}`;
}

/** Short, unambiguous date. Fixed locale so server and client agree. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Minutes as `25 min` or `1 hr 5 min`. Used for tutorial length. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

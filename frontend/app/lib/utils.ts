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
  const major = minorUnits / 100;
  const formatted = major.toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === 'NPR' ? `Rs ${formatted}` : `${currency} ${formatted}`;
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

/** `2 hours ago`, `3 days ago`. Falls back to a date beyond a month. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.round((Date.now() - then) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
  ];

  let value = seconds;
  for (const [unit, size] of units) {
    if (Math.abs(value) < size) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-value, unit);
    }
    value = Math.round(value / size);
  }

  return formatDate(iso);
}

/** Minutes as `25 min` or `1 hr 5 min`. Used for tutorial length. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

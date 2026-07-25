import { AppError } from './errors.ts';

/**
 * A small hand-rolled body validator. Deliberately not a dependency — the
 * project needs about six rules, and zod would be a bigger surface than the
 * thing it validates.
 *
 * Usage:
 *   const body = validateBody(req.body, {
 *     email: [required, isEmail],
 *     password: [required, minLength(8)],
 *   });
 *
 * Collects every field error before throwing, so a form shows all its problems
 * at once rather than one per submit.
 */

export type Rule = (value: unknown, field: string) => string | null;

export const required: Rule = (value, field) => {
  if (value === undefined || value === null) return `${field} is required.`;
  if (typeof value === 'string' && value.trim() === '') return `${field} is required.`;
  return null;
};

export const isString: Rule = (value, field) =>
  typeof value === 'string' ? null : `${field} must be text.`;

export const isEmail: Rule = (value, field) => {
  if (typeof value !== 'string') return `${field} must be text.`;
  // Deliberately loose: the only real test of an address is sending mail to it.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : `${field} must be a valid email.`;
};

export const isInteger: Rule = (value, field) =>
  typeof value === 'number' && Number.isInteger(value) ? null : `${field} must be a whole number.`;

export function minLength(n: number): Rule {
  return (value, field) => {
    if (typeof value !== 'string') return `${field} must be text.`;
    return value.trim().length >= n ? null : `${field} must be at least ${n} characters.`;
  };
}

export function maxLength(n: number): Rule {
  return (value, field) => {
    if (typeof value !== 'string') return `${field} must be text.`;
    return value.trim().length <= n ? null : `${field} must be at most ${n} characters.`;
  };
}

export function oneOf<T extends string>(allowed: readonly T[]): Rule {
  return (value, field) =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
      ? null
      : `${field} must be one of: ${allowed.join(', ')}.`;
}

export type Schema<T> = { [K in keyof T]: Rule[] };

/**
 * Validates `body` against `schema` and returns it typed as `T`.
 * Throws a 400 `AppError` carrying per-field messages when anything fails.
 */
export function validateBody<T>(body: unknown, schema: Schema<T>): T {
  if (typeof body !== 'object' || body === null) {
    throw AppError.badRequest('Request body must be a JSON object.');
  }

  const source = body as Record<string, unknown>;
  const fields: Record<string, string> = {};

  for (const key of Object.keys(schema) as (keyof T & string)[]) {
    for (const rule of schema[key]) {
      const message = rule(source[key], key);
      if (message !== null) {
        fields[key] = message;
        break; // first failure per field is enough
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    throw AppError.badRequest('Please correct the highlighted fields.', fields);
  }

  return source as T;
}

/** Parses a query-string integer with a fallback and hard bounds. */
export function queryInt(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

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

/** A whole number >= 0 — stock, prices in minor units. */
export const isNonNegativeInteger: Rule = (value, field) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? null
    : `${field} must be a whole number of 0 or more.`;

/** A whole number >= 1 — estimated minutes, step numbers. */
export const isPositiveInteger: Rule = (value, field) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? null
    : `${field} must be a whole number of 1 or more.`;

/** Exactly the slug shape: lowercase letters, digits and single hyphens between. */
export const isSlug: Rule = (value, field) => {
  if (typeof value !== 'string') return `${field} must be text.`;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())
    ? null
    : `${field} must be a lowercase slug like "crane-traditional".`;
};

export function minLength(n: number): Rule {
  return (value, field) => {
    // A non-string cannot violate a length floor; the field identity is the
    // caller's job via the rule before this one (`required`/`isString`).
    if (typeof value !== 'string') return null;
    return value.trim().length >= n ? null : `${field} must be at least ${n} characters.`;
  };
}

export function maxLength(n: number): Rule {
  return (value, field) => {
    if (typeof value !== 'string') return null;
    return value.trim().length <= n ? null : `${field} must be at most ${n} characters.`;
  };
}

export function oneOf<T extends string>(allowed: readonly T[]): Rule {
  return (value, field) =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
      ? null
      : `${field} must be one of: ${allowed.join(', ')}.`;
}

/**
 * Wraps a rule so an absent field passes instead of failing. Used for partial
 * updates (PATCH), where a field is validated only when it is present.
 */
export function optional(rule: Rule): Rule {
  return (value, field) => (value === undefined || value === null ? null : rule(value, field));
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

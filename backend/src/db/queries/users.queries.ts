import type { AdminUser, Role, User, UserWithSecret } from '@foldify/shared';
import { db } from '../index.ts';

/** SQL only — see products.queries.ts for the rules. */

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  avatar_url: string | null;
  banned_at: string | null;
  deleted_at: string | null;
  last_active_at: string | null;
  created_at: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

function mapUserWithSecret(row: UserRow): UserWithSecret {
  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
    bannedAt: row.banned_at,
    deletedAt: row.deleted_at,
    lastActiveAt: row.last_active_at,
  };
}

export function getUserById(id: number): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row === undefined ? null : mapUser(row);
}

/** Includes the password hash — for verifying credentials against a specific account only. */
export function getUserByIdWithSecret(id: number): UserWithSecret | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row === undefined ? null : mapUserWithSecret(row);
}

/** Includes the password hash — for the login handler only. Never send this to a client. */
export function getUserByEmailWithSecret(email: string): UserWithSecret | null {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as UserRow | undefined;
  return row === undefined ? null : mapUserWithSecret(row);
}

export function emailExists(email: string): boolean {
  const row = db
    .prepare('SELECT 1 AS found FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as { found: number } | undefined;
  return row !== undefined;
}

/** Public shape for a single email lookup — used to enforce email uniqueness on profile updates. */
export function getUserByEmail(email: string): User | null {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as UserRow | undefined;
  return row === undefined ? null : mapUser(row);
}

export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
  role?: Role;
}

export function insertUser(input: NewUser): User {
  const result = db
    .prepare(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES (@email, @name, @passwordHash, @role)`,
    )
    .run({
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      role: input.role ?? 'customer',
    });

  const created = getUserById(Number(result.lastInsertRowid));
  if (created === null) throw new Error('User insert succeeded but the row could not be read back.');
  return created;
}

/** Idempotent — used by the seed script so re-running it never duplicates the admin. */
export function upsertUserByEmail(input: NewUser): User {
  db.prepare(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES (@email, @name, @passwordHash, @role)
     ON CONFLICT (email) DO UPDATE SET
       name          = excluded.name,
       password_hash = excluded.password_hash,
       role          = excluded.role`,
  ).run({
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    role: input.role ?? 'customer',
  });

  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(input.email.trim().toLowerCase()) as UserRow;
  return mapUser(row);
}

export function countUsers(): number {
  return (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
}

/**
 * Every user for the admin users page, with a live total of their orders and
 * spend. `password_hash` is deliberately never selected. Deleted accounts are
 * included so an admin can see who was removed and reverse the mistake.
 */
export function listUsersWithStats(): AdminUser[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.created_at,
              u.banned_at, u.deleted_at, u.last_active_at,
              COUNT(o.id) AS order_count,
              COALESCE(SUM(o.total_minor), 0) AS total_spent_minor
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC, u.id DESC`,
    )
    .all() as (UserRow & { order_count: number; total_spent_minor: number })[];

  return rows.map((row) => ({
    ...mapUser(row),
    orderCount: row.order_count,
    totalSpentMinor: row.total_spent_minor,
    bannedAt: row.banned_at,
    deletedAt: row.deleted_at,
    lastActiveAt: row.last_active_at,
  }));
}

/** Sets the role, returning the updated row, or null when the user is missing. */
export function updateUserRole(id: number, role: Role): User | null {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return getUserById(id);
}

/**
 * Bans or unbans an account. Banned users cannot log in and their existing
 * sessions immediately stop resolving (requireAuth checks the flag on lookup).
 */
export function setUserBanned(id: number, banned: boolean): AdminUser | null {
  db.prepare('UPDATE users SET banned_at = ? WHERE id = ?').run(banned ? new Date().toISOString() : null, id);
  return getUserAdminById(id);
}

/**
 * Soft-deletes or restores an account. A soft delete keeps the row so every
 * order and review keeps its foreign key; the account is hidden from the admin
 * list's live set and denied login like a banned one.
 */
export function setUserDeleted(id: number, deleted: boolean): AdminUser | null {
  db.prepare('UPDATE users SET deleted_at = ? WHERE id = ?').run(deleted ? new Date().toISOString() : null, id);
  return getUserAdminById(id);
}

/** The admin-shaped row for a single user, or null when missing. */
function getUserAdminById(id: number): AdminUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.created_at,
              u.banned_at, u.deleted_at, u.last_active_at
       FROM users u WHERE u.id = ?`,
    )
    .get(id) as
    | Pick<UserRow, 'id' | 'email' | 'name' | 'role' | 'avatar_url' | 'banned_at' | 'deleted_at' | 'last_active_at' | 'created_at'>
    | undefined;

  if (row === undefined) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    orderCount: 0,
    totalSpentMinor: 0,
    bannedAt: row.banned_at,
    deletedAt: row.deleted_at,
    lastActiveAt: row.last_active_at,
  };
}

/**
 * Replaces the stored password hash — the shared path for account owners
 * changing their own password and admins resetting someone else's.
 * Never returns anything to a client.
 */
export function setUserPassword(id: number, passwordHash: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

/** Marks the account as active right now. Session lookups call this. */
export function touchUserActivity(id: number): void {
  db.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    id,
  );
}

export interface UpdateUserFields {
  name?: string;
  email?: string;
}

/**
 * Partial update of name and/or email, normalising the way the insert does.
 * Built per-call so an absent field is never re-written; returns the refreshed
 * row, or null when the user is missing.
 */
export function updateUser(id: number, fields: UpdateUserFields): User | null {
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (fields.name !== undefined) {
    updates.push('name = ?');
    values.push(fields.name.trim());
  }
  if (fields.email !== undefined) {
    updates.push('email = ?');
    values.push(fields.email.trim().toLowerCase());
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
  }

  return getUserById(id);
}

import type { Role, User, UserWithSecret } from '@foldify/shared';
import { db } from '../index.ts';

/** SQL only — see products.queries.ts for the rules. */

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  avatar_url: string | null;
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
  return { ...mapUser(row), passwordHash: row.password_hash };
}

export function getUserById(id: number): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row === undefined ? null : mapUser(row);
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

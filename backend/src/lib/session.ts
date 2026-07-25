import crypto from 'node:crypto';
import type { Response } from 'express';
import type { User } from '@foldify/shared';
import { config, isProduction } from '../config.ts';
import { db } from '../db/index.ts';
import { getUserById } from '../db/queries/users.queries.ts';

/**
 * Cookie sessions, not JWTs. The session id is an opaque random string; all
 * state lives in the `sessions` table so logout can actually revoke.
 */

const SESSION_DAYS = 7;

export function createSession(userId: number): string {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expiresAt);
  return id;
}

/** Returns the session's user, or null if the session is missing or expired. */
export function getUserForSession(sessionId: string | undefined): User | null {
  if (sessionId === undefined || sessionId === '') return null;

  const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(sessionId) as
    | { user_id: number; expires_at: string }
    | undefined;

  if (row === undefined) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(sessionId);
    return null;
  }

  return getUserById(row.user_id);
}

export function destroySession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/** Housekeeping — call on boot. */
export function purgeExpiredSessions(): number {
  return db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run().changes;
}

export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(config.sessionCookieName, sessionId, {
    httpOnly: true, // unreadable from JavaScript
    sameSite: 'lax', // survives top-level navigation, blocks cross-site POST
    secure: isProduction, // HTTPS-only in production; off in dev or localhost breaks
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.sessionCookieName, { path: '/' });
}

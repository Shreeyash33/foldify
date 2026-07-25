import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * All configuration is read here, from `.env`, at import time.
 *
 * Windows note: npm scripts must never set env vars inline
 * (`PORT=4000 tsx src/server.ts` fails in cmd.exe and PowerShell), so the app
 * reads its own config instead of relying on the shell.
 */

const here = path.dirname(fileURLToPath(import.meta.url));

/** backend/ — the directory that owns .env and the data/ folder. */
export const BACKEND_ROOT = path.join(here, '..');

dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });

function str(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function int(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  port: int('PORT', 4000),
  nodeEnv: str('NODE_ENV', 'development'),
  frontendOrigin: str('FRONTEND_ORIGIN', 'http://localhost:3000'),
  sessionCookieName: str('SESSION_COOKIE_NAME', 'foldify_sid'),
  /** Always joined, never concatenated — path separators differ per platform. */
  dbPath: path.join(BACKEND_ROOT, str('DB_PATH', './data/foldify.db')),
  seedAdminEmail: str('SEED_ADMIN_EMAIL', 'admin@foldify.local'),
  seedAdminPassword: str('SEED_ADMIN_PASSWORD', 'foldify-admin'),
  version: '0.1.0',
} as const;

export const isProduction = config.nodeEnv === 'production';

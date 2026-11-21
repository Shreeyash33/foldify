import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * All configuration is read here, from `.env`, at import time.
 *
 * On Windows, npm scripts must never set env vars inline
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

/** First entry of a comma-separated origin list — used as the URL fallback. */
function firstOfList(raw: string, fallback: string): string {
  const first = raw
    .split(',')
    .map((entry) => entry.trim())
    .find(Boolean);
  return first === undefined ? fallback : first;
}

const frontendOrigin = str('FRONTEND_ORIGIN', 'http://localhost:3000');

export const config = {
  port: int('PORT', 4000),
  nodeEnv: str('NODE_ENV', 'development'),
  /**
   * CORS allow-list, may hold several origins ("http://localhost:3000,
   * http://192.168.1.50:3000"). Never shared with anything that wants exactly
   * one URL — see `frontendUrl`.
   */
  frontendOrigin,
  /**
   * The single canonical frontend URL for provider redirects (Khalti's
   * return_url / website_url). Defaults to the first entry of the CORS list,
   * so a plain one-origin setup needs no extra config; a multi-origin LAN dev
   * run can override it explicitly when needed.
   */
  frontendUrl: str('FRONTEND_URL', firstOfList(frontendOrigin, 'http://localhost:3000')),
  sessionCookieName: str('SESSION_COOKIE_NAME', 'foldify_sid'),
  /** Always joined, never concatenated — path separators differ per platform. */
  dbPath: path.join(BACKEND_ROOT, str('DB_PATH', './data/foldify.db')),
  seedAdminEmail: str('SEED_ADMIN_EMAIL', 'admin@foldify.local'),
  seedAdminPassword: str('SEED_ADMIN_PASSWORD', 'foldify-admin'),
  khaltiSecretKey: str('KHALTI_SECRET_KEY', ''),
  khaltiBaseUrl: str('KHALTI_BASE_URL', 'https://dev.khalti.com'),
  /**
   * How long delivery takes after an order is placed, in hours. Drives the
   * delivery estimate in the order-confirmation SMS and on the order page.
   */
  deliveryEstimateHours: int('DELIVERY_ESTIMATE_HOURS', 72),
  version: '0.1.0',
} as const;

export const isProduction = config.nodeEnv === 'production';

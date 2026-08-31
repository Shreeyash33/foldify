import type { ModuleHealth, StatusResponse } from '@foldify/shared';
import { config } from '../config.ts';
import { getDbHealth } from '../db/index.ts';

/**
 * services/ = business logic. No SQL, no `req`/`res`.
 *
 * This one assembles the health payload that the showcase page renders live —
 * it is this commit's proof that frontend and backend actually talk to each other.
 */

const startedAt = Date.now();

/**
 * Which parts of the API are real today.
 *
 * 'degraded' means some endpoints in the module work and some are still 501
 * stubs. Update the value as you land each piece — the showcase page renders
 * this live, so it doubles as the project's progress board and nobody has to
 * maintain a separate status doc that goes stale.
 */
const MODULES: Record<string, ModuleHealth> = {
  status: 'ok',
  auth: 'ok', // register, login, logout and session restore all work
  products: 'degraded', // GET /, GET /:slug, reviews and analytics work; write ops are stubs
  tutorials: 'degraded', // GET / works; detail endpoint and write ops are stubs
  orders: 'degraded', // GET /, POST /, GET /:id, POST /:id/verify work; admin status update is stub
  contact: 'degraded', // POST / works; the admin inbox is a stub
  payments: 'not-implemented', // simulated gateway only — no real provider yet
};

export function getStatus(): StatusResponse {
  const database = getDbHealth();

  return {
    service: 'foldify-api',
    version: config.version,
    environment: config.nodeEnv,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    database,
    modules: { ...MODULES, database: database.connected ? 'ok' : 'down' },
  };
}

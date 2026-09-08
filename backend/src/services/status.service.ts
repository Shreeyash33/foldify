import type { ModuleHealth, StatusResponse } from '@foldify/shared';
import { config } from '../config.ts';
import { getDbHealth } from '../db/index.ts';

/**
 * services/ = business logic. No SQL, no `req`/`res`.
 *
 * This one assembles the health payload that the showcase page renders live.
 */

const startedAt = Date.now();

/**
 * Which parts of the API are real today.
 *
 * 'degraded' means some endpoints in the module work and some are still 501
 * stubs. The showcase page renders this map live, so it doubles as a status
 * surface and no separate status doc can go stale.
 */
const MODULES: Record<string, ModuleHealth> = {
  status: 'ok',
  auth: 'ok', // register, login, logout and session restore all work
  products: 'ok', // full catalogue read API + admin write CRUD (create, update, soft delete)
  tutorials: 'ok', // list, detail, steps + admin CRUD (create, update, append steps, unpublish)
  orders: 'ok', // customer list/create/detail/verify + admin status updates
  contact: 'ok', // public submit + admin inbox (list, mark handled)
  payments: 'ok', // Khalti sandbox + simulated fallback when unconfigured
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

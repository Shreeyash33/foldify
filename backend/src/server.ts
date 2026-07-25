import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, isProduction } from './config.ts';
import { applySchema, getDbHealth } from './db/index.ts';
import { purgeExpiredSessions } from './lib/session.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import apiRouter from './routes/index.ts';

const app = express();

/* ----------------------------------------------------------------- CORS */
/*
 * Explicit origin, never '*'. A wildcard origin combined with
 * `credentials: true` is silently rejected by every browser, and the resulting
 * "cookie just doesn't arrive" bug costs days. The frontend must correspondingly
 * send `credentials: 'include'` on every request — see lib/api-client.ts.
 */
app.use(cors({ origin: config.frontendOrigin, credentials: true }));

/* ----------------------------------------------------------- middleware */

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Dev request logger. Small on purpose; morgan would be another dependency.
if (!isProduction) {
  app.use((req, _res, next) => {
    console.log(`  ${req.method.padEnd(6)} ${req.originalUrl}`);
    next();
  });
}

/* --------------------------------------------------------------- routes */

app.use('/api', apiRouter);

/* ------------------------------------------- 404, then the error handler */
/* Order matters: the error handler must be mounted LAST of all. */

app.use(notFoundHandler);
app.use(errorHandler);

/* --------------------------------------------------------------- boot */

applySchema();
const purged = purgeExpiredSessions();
const health = getDbHealth();

app.listen(config.port, () => {
  console.log('');
  console.log(`  Foldify API v${config.version}  [${config.nodeEnv}]`);
  console.log(`  ➜  http://localhost:${config.port}/api/status`);
  console.log(`  ➜  db ${health.path}`);
  console.log(`     ${health.tables} tables · foreign_keys ${health.foreignKeys ? 'ON' : 'OFF'} · journal ${health.journalMode}`);
  console.log(`  ➜  cors origin ${config.frontendOrigin} (credentials: true)`);
  if (purged > 0) console.log(`  ➜  purged ${purged} expired session(s)`);
  console.log('');
});

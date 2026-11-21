import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../config.ts';

/**
 * The single database connection for the process.
 *
 * better-sqlite3 is synchronous by design — no callbacks, no promises. That is
 * correct here: SQLite reads are microseconds, and synchronous code is far
 * easier for someone learning Express to get right.
 */

const dbFile = config.dbPath;

// path.join everywhere — never string-concatenate separators.
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db: Database.Database = new Database(dbFile);

// SQLite ships with foreign keys DISABLED. Without this line every FOREIGN KEY
// in schema.sql is a comment. This must run before any statement is prepared.
db.pragma('foreign_keys = ON');

// Write-ahead logging: readers do not block the writer. Creates -wal/-shm
// sidecar files next to the .db, both gitignored.
db.pragma('journal_mode = WAL');

/** Executes schema.sql. Safe to call on every boot — every statement is IF NOT EXISTS. */
export function applySchema(): void {
  // fileURLToPath, not url.pathname — the latter yields `/D:/...` on Windows.
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);

  // Migration for databases created before discounts existed: `CREATE TABLE IF
  // NOT EXISTS` never touches an existing table, so the new column must be
  // added explicitly — but only when it is missing, keeping this safe on both
  // fresh (schema.sql already has it) and pre-existing databases.
  const productColumns = db.prepare(`PRAGMA table_info(products)`).all() as { name: string }[];
  if (!productColumns.some((column) => column.name === 'compare_at_price_minor')) {
    db.exec(`ALTER TABLE products ADD COLUMN compare_at_price_minor INTEGER`);
  }

  // Same story for databases created before a fold had a draft/deployed
  // lifecycle. SQLite cannot add a CHECK to an existing table, so the constraint
  // lives in schema.sql for fresh databases and the column alone is added here.
  const craftColumns = db.prepare(`PRAGMA table_info(craft_files)`).all() as { name: string }[];
  if (!craftColumns.some((column) => column.name === 'status')) {
    db.exec(`ALTER TABLE craft_files ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'`);
  }

  // Databases created before admin moderation (ban / soft-delete / activity
  // tracking) existed: add the three nullable columns. Nullable means no new
  // CHECK or DEFAULT, so ALTER TABLE is safe on an existing populated table.
  const userColumns = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
  if (!userColumns.some((column) => column.name === 'banned_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN banned_at TEXT`);
  }
  if (!userColumns.some((column) => column.name === 'deleted_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN deleted_at TEXT`);
  }
  if (!userColumns.some((column) => column.name === 'last_active_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN last_active_at TEXT`);
  }

  // Databases created before the inbox could archive messages: same story,
  // a DEFAULT 0 column so existing rows read as not archived. The supporting
  // index cannot live in schema.sql — that runs before migrations, and a fresh
  // build would never get here to create it — so it is created here instead,
  // only once the column is guaranteed to exist on every database.
  const contactColumns = db.prepare(`PRAGMA table_info(contact_messages)`).all() as { name: string }[];
  if (!contactColumns.some((column) => column.name === 'is_archived')) {
    db.exec(`ALTER TABLE contact_messages ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_messages_is_archived ON contact_messages (is_archived)`);
}

export interface DbHealth {
  connected: boolean;
  path: string;
  foreignKeys: boolean;
  journalMode: string;
  tables: number;
}

/** Read back the relevant pragmas, so /api/status reports reality rather than intent. */
export function getDbHealth(): DbHealth {
  try {
    const fk = db.pragma('foreign_keys', { simple: true });
    const journal = db.pragma('journal_mode', { simple: true });
    const row = db
      .prepare(`SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .get() as { count: number };

    return {
      connected: true,
      path: dbFile,
      foreignKeys: fk === 1,
      journalMode: String(journal),
      tables: row.count,
    };
  } catch {
    return { connected: false, path: dbFile, foreignKeys: false, journalMode: 'unknown', tables: 0 };
  }
}

export function closeDb(): void {
  db.close();
}

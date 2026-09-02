import type { ContactMessage } from '@foldify/shared';
import { db } from '../index.ts';

/**
 * SQL only — see products.queries.ts for the rules.
 */

interface ContactMessageRow {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  is_handled: number;
  created_at: string;
}

function mapContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    body: row.body,
    isHandled: row.is_handled === 1,
    createdAt: row.created_at,
  };
}

export interface NewContactMessage {
  name: string;
  email: string;
  subject: string;
  body: string;
}

/** Insert a contact form message. Returns the created row. */
export function insertContactMessage(input: NewContactMessage): ContactMessage {
  const result = db
    .prepare(
      `INSERT INTO contact_messages (name, email, subject, body)
       VALUES (@name, @email, @subject, @body)`,
    )
    .run({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      subject: input.subject.trim(),
      body: input.body.trim(),
    });

  const row = db
    .prepare('SELECT * FROM contact_messages WHERE id = ?')
    .get(result.lastInsertRowid) as ContactMessageRow;

  return mapContactMessage(row);
}

/** All messages for the admin inbox: unhandled first, then newest. */
export function listContactMessages(): ContactMessage[] {
  const rows = db
    .prepare(
      `SELECT id, name, email, subject, body, is_handled, created_at
       FROM contact_messages
       ORDER BY is_handled ASC, created_at DESC, id DESC`,
    )
    .all() as ContactMessageRow[];

  return rows.map(mapContactMessage);
}

export function getContactMessage(id: number): ContactMessage | null {
  const row = db
    .prepare('SELECT * FROM contact_messages WHERE id = ?')
    .get(id) as ContactMessageRow | undefined;
  return row === undefined ? null : mapContactMessage(row);
}

/** Mark a message handled or reopened. Returns null if the id does not exist. */
export function setContactHandled(id: number, handled: boolean): ContactMessage | null {
  db.prepare('UPDATE contact_messages SET is_handled = ? WHERE id = ?').run(handled ? 1 : 0, id);
  return getContactMessage(id);
}

export function countUnhandledMessages(): number {
  return (
    db
      .prepare('SELECT COUNT(*) AS count FROM contact_messages WHERE is_handled = 0')
      .get() as { count: number }
  ).count;
}

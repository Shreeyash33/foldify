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

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  isHandled: boolean;
  createdAt: string;
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

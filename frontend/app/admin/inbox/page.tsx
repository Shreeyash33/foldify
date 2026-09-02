import type { Metadata } from 'next';
import { InboxView } from './InboxView';

export const metadata: Metadata = { title: 'Admin · Inbox' };

export default function AdminInboxPage() {
  return <InboxView />;
}
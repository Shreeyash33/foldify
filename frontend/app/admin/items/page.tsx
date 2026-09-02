import type { Metadata } from 'next';
import { ItemsView } from './ItemsView';

export const metadata: Metadata = { title: 'Admin · Items' };

export default function AdminItemsPage() {
  return <ItemsView />;
}
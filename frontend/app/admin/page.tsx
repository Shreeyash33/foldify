import type { Metadata } from 'next';
import { OverviewView } from './OverviewView';

export const metadata: Metadata = { title: 'Admin · Overview' };

export default function AdminPage() {
  return <OverviewView />;
}
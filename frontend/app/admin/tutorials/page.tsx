import type { Metadata } from 'next';
import { TutorialsView } from './TutorialsView';

export const metadata: Metadata = { title: 'Admin · Tutorials' };

export default function AdminTutorialsPage() {
  return <TutorialsView />;
}
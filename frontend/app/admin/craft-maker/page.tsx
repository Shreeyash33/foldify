import type { Metadata } from 'next';
import { CraftMakerView } from './CraftMakerView';

export const metadata: Metadata = { title: 'Admin · Craft Maker' };

export default function CraftMakerPage() {
  return <CraftMakerView />;
}

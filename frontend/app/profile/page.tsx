import type { Metadata } from 'next';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ProfileView } from './ProfileView';

export const metadata: Metadata = { title: 'Profile' };

/** Auth-gated: nothing on this page may be cached or shared between viewers. */
export default function ProfilePage() {
  return (
    <Container width="default" className="flex flex-col gap-6 pb-16">
      <PageHeader
        title="Profile"
        eyebrow="Account"
        description="Your details and your past orders."
      />

      <ProfileView />
    </Container>
  );
}

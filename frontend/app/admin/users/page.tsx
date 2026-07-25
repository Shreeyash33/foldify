import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Admin · Users' };

export default function AdminUsersPage() {
  return (
    <ComingSoon
      contained={false}
      title="Users"
      eyebrow="Admin"
      description="Accounts and roles."
      notes={[
        'Never send password_hash to the client. getUserById() already strips it; keep it that way.',
        'Promoting a user to admin should be a deliberate, confirmed action — use <Modal> with a danger button.',
      ]}
    />
  );
}

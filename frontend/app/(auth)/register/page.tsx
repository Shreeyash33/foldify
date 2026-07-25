import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <ComingSoon
      title="Create account"
      eyebrow="Account"
      description="Name, email and password, then straight into a session."
      notes={[
        'Same form pattern as /login — reuse it rather than writing a second one.',
        'Password confirmation is a client-side check; the API only takes one password.',
        'A duplicate email comes back as a 409 with code CONFLICT.',
        'Show a toast on success via useToast().',
      ]}
    />
  );
}

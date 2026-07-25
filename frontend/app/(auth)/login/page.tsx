import type { Metadata } from 'next';
import { ComingSoon } from '@/app/components/layout/ComingSoon';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <ComingSoon
      title="Sign in"
      eyebrow="Account"
      description="Email and password, into a cookie session."
      notes={[
        'Use <Input> for both fields and <Button isLoading> while the request is in flight.',
        'Call login() from useAuth() — never fetch directly.',
        'Catch ApiClientError and show error.fields on the matching <Input error> prop.',
        'Redirect to the page the user came from, or /profile.',
      ]}
    />
  );
}

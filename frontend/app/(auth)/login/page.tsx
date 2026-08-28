import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { AuthForm, AuthFormFallback } from '../AuthForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Container width="narrow" className="pb-16">
      <PageHeader
        title="Sign in"
        eyebrow="Account"
        description="Email and password, into a cookie session."
      />

      {/* AuthForm reads `?next=` via useSearchParams, which needs a Suspense
          boundary for the shell around it to stay prerenderable. */}
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="login" />
      </Suspense>
    </Container>
  );
}

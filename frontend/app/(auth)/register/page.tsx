import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/app/components/layout/Container';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { AuthForm, AuthFormFallback } from '../AuthForm';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <Container width="narrow" className="pb-16">
      <PageHeader
        title="Create account"
        eyebrow="Account"
        description="Name, email and password, then straight into a session."
      />

      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="register" />
      </Suspense>
    </Container>
  );
}

import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { AdminGate } from './AdminGate';
import { AdminSidebar } from '@/app/components/layout/AdminSidebar';
import { Container } from '@/app/components/layout/Container';
import { getCurrentUser } from '@/app/lib/api-client';

async function AdminCheck({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (user === null) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    notFound();
  }

  return <AdminGate>{children}</AdminGate>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container width="wide" className="flex flex-col gap-6 py-6 md:flex-row md:py-8">
      <AdminSidebar className="md:sticky md:top-24 md:self-start" />
      <div className="min-w-0 flex-1">
        <Suspense>
          <AdminCheck>{children}</AdminCheck>
        </Suspense>
      </div>
    </Container>
  );
}
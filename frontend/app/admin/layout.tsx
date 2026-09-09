import { Suspense } from 'react';
import { AdminCheck } from './admin-layout-content';
import { AdminSidebar } from '@/app/components/layout/AdminSidebar';
import { Container } from '@/app/components/layout/Container';

/** /admin chrome. The server runs the admin check inside Suspense; the gate
    always renders children so the segment is never dropped by instant
    navigation. */
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

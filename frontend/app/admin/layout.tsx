import { AdminGate } from './AdminGate';
import { AdminSidebar } from '@/app/components/layout/AdminSidebar';
import { Container } from '@/app/components/layout/Container';

/**
 * Admin chrome: cardboard sidebar beside the page content, stacked below `md`.
 *
 * AdminGate is the client-side access check. It honours useAuth().isLoading so
 * a signed-in admin never flashes the signed-out branch, redirects
 * signed-out visitors to /login, and shows customers an access-denied card.
 * The real enforcement is requireAdmin on the server; this only hides the UI.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container width="wide" className="flex flex-col gap-6 py-6 md:flex-row md:py-8">
      <AdminSidebar className="md:sticky md:top-24 md:self-start" />
      <div className="min-w-0 flex-1">
        <AdminGate>{children}</AdminGate>
      </div>
    </Container>
  );
}
import { AdminSidebar } from '@/app/components/layout/AdminSidebar';
import { Container } from '@/app/components/layout/Container';

/**
 * Admin chrome: cardboard sidebar beside the page content, stacked below `md`.
 *
 * There is no access check here yet. Whoever builds the admin section should
 * add one — check useAuth() for role === 'admin' and honour isLoading, and
 * remember the real enforcement is requireAdmin on the server. A client-side
 * check only hides the UI; it does not protect the data.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container width="wide" className="flex flex-col gap-6 py-6 md:flex-row md:py-8">
      <AdminSidebar className="md:sticky md:top-24 md:self-start" />
      <div className="min-w-0 flex-1">{children}</div>
    </Container>
  );
}

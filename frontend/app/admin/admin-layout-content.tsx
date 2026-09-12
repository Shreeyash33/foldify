import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/api-client';
import AdminGate from './AdminGate';

/** Server-authoritative admin check for /admin. Redirects signed-out users to
    /login and 404s customers, so the UI below lives in the server-rendered
    tree and is never dropped from Next instant navigation. */
export async function AdminCheck({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (user === null) redirect('/login?next=/admin');
  if (user.role !== 'admin') notFound();
  return <AdminGate>{children}</AdminGate>;
}

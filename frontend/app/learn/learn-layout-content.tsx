import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/api-client';
import LearnGate from './LearnGate';

/**
 * Server-authoritative sign-in check for /learn. Redirects signed-out users to
 * /login; the API 404s where the tutorial queries begin, so the gate ensures a
 * signed-in viewer. Reading the user here (not in the client gate) means the
 * layout always renders its children and is pr-validated by Next instant
 * navigation — the gate itself never replaces children with a loading skeleton.
 */
export async function LearnCheck({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (user === null) redirect('/login?next=/learn');
  return <LearnGate>{children}</LearnGate>;
}

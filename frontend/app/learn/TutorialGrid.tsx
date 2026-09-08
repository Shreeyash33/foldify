import { CardGridSkeleton } from '@/app/components/feedback/CardGridSkeleton';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { getTutorialList } from '@/app/lib/catalogue';
import { ApiClientError } from '@/app/lib/api-client';
import { TutorialCard } from './TutorialCard';

export type TutorialSearchParams = Record<string, string | string[] | undefined>;

export function TutorialGridSkeleton() {
  return (
    <CardGridSkeleton
      count={6}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    />
  );
}

/**
 * The awaited `searchParams` is the deferred boundary: it exists only in a
 * dynamic context, so cacheComponents holds this component back from the
 * static shell and calls `getTutorialList` at runtime, not at build time.
 */
export async function TutorialGrid({
  searchParams,
}: {
  searchParams: Promise<TutorialSearchParams>;
}) {
  await searchParams;

  let tutorials;
  try {
    tutorials = await getTutorialList();
  } catch (error) {
    const message =
      error instanceof ApiClientError && error.isNetworkFailure
        ? 'The tutorials are not reachable right now. Start the API and reload.'
        : 'The tutorials could not be loaded. Please try again shortly.';

    return (
      <ErrorCard
        message={message}
        retryHref="/learn"
      />
    );
  }

  if (tutorials.length === 0) {
    return <EmptyState message="No tutorials have been published yet. Check back soon." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tutorials.map((tutorial) => (
        <TutorialCard key={tutorial.id} tutorial={tutorial} />
      ))}
    </div>
  );
}
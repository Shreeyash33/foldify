import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { getTutorialList } from '@/app/lib/catalogue';
import { ApiClientError } from '@/app/lib/api-client';
import { TutorialCard } from './TutorialCard';

export type TutorialSearchParams = Record<string, string | string[] | undefined>;

export function TutorialGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index}>
          <Skeleton shape="block" />
          <CardBody className="flex flex-col gap-2">
            <Skeleton shape="title" />
            <Skeleton shape="text" lines={2} />
          </CardBody>
        </Card>
      ))}
    </div>
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
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>{message}</p>
          <Button href="/learn" variant="secondary" size="sm">
            Try again
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (tutorials.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <p>No tutorials have been published yet. Check back soon.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tutorials.map((tutorial) => (
        <TutorialCard key={tutorial.id} tutorial={tutorial} />
      ))}
    </div>
  );
}
import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';

/**
 * The shared loading placeholder for a vertical stack of cards (admin lists,
 * the home strip, etc.). Every view used to hand-write the same
 * `Array.from(...)` of title + text skeletons; this is that loop in one place.
 */
export function ListSkeleton({
  count = 4,
  lines = 2,
  className = 'flex flex-col gap-3',
}: {
  count?: number;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <CardBody className="flex flex-col gap-3">
            <Skeleton shape="title" />
            <Skeleton shape="text" lines={lines} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

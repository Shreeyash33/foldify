import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';

export function CardGridSkeleton({
  count,
  className,
  lines = 2,
}: {
  count: number;
  className?: string;
  lines?: number;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <Skeleton shape="block" />
          <CardBody className="flex flex-col gap-2">
            <Skeleton shape="title" />
            <Skeleton shape="text" lines={lines} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

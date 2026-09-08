import { Card, CardBody } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';

export default function LearnLoading() {
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

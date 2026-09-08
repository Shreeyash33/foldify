'use client';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Container } from '@/app/components/layout/Container';

export default function ErrorComponent({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container width="narrow" className="flex flex-col items-stretch gap-6 py-16">
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>{error.message}</p>
          <Button onClick={() => reset()} variant="secondary" size="sm">
            Try again
          </Button>
        </CardBody>
      </Card>
    </Container>
  );
}

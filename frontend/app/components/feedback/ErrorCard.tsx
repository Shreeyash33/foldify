'use client';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';

/**
 * The shared "something went wrong" card. Every data view — admin, shop,
 * learn, reviews — renders the same Problem card, so it lives here once
 * instead of being copy-pasted a dozen times.
 */
export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3">
        <Badge tone="danger">Problem</Badge>
        <p>{message}</p>
        {onRetry !== undefined ? (
          <Button onClick={() => onRetry()} variant="secondary" size="sm">
            Try again
          </Button>
        ) : null}
      </CardBody>
    </Card>
  );
}

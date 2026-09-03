import type { ReactNode } from 'react';
import { Card, CardBody } from '@/app/components/ui/Card';

/**
 * The shared "nothing here yet" card, with an optional action (usually a
 * Button linking back or clearing filters).
 */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3">
        <p>{message}</p>
        {action !== undefined ? <div>{action}</div> : null}
      </CardBody>
    </Card>
  );
}

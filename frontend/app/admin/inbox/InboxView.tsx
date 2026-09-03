'use client';

import { useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta } from '@/app/components/ui/Card';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { useToast } from '@/app/contexts/ToastContext';
import { listContactMessages, setContactHandled } from '@/app/lib/api-client';
import { useFetchData } from '@/app/lib/hooks';
import type { ContactMessage } from '@foldify/shared';

export function InboxView() {
  const toast = useToast();
  const { data: messages, error, reload } = useFetchData(
    listContactMessages,
    'Could not load the inbox.',
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleToggle = async (message: ContactMessage) => {
    setBusyId(message.id);
    try {
      await setContactHandled(message.id, !message.isHandled);
      toast.success(message.isHandled ? 'Marked as open.' : 'Marked as handled.');
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update the message.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        eyebrow="Admin"
        title="Inbox"
        description="Contact form messages, unhandled on top."
      />

      {error !== null ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : messages === null ? (
        <ListSkeleton count={3} lines={3} />
      ) : messages.length === 0 ? (
        <EmptyState message="The inbox is empty. Nice." />
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <Card key={message.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crease px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-ink">{message.subject}</span>
                    {message.isHandled ? (
                      <Badge tone="neutral" size="sm">
                        Handled
                      </Badge>
                    ) : (
                      <Badge tone="danger" size="sm">
                        Open
                      </Badge>
                    )}
                  </div>
                  <CardMeta>
                    {message.name} &lt;{message.email}&gt; · {message.createdAt}
                  </CardMeta>
                </div>
              </div>

              <CardBody>
                <p className="font-body text-base whitespace-pre-wrap break-words text-ink">{message.body}</p>
              </CardBody>

              <CardFooter className="justify-end">
                <Button
                  variant={message.isHandled ? 'secondary' : 'primary'}
                  size="sm"
                  isLoading={busyId === message.id}
                  onClick={() => void handleToggle(message)}
                >
                  {message.isHandled ? 'Reopen' : 'Mark handled'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { useToast } from '@/app/contexts/ToastContext';
import { listContactMessages, setContactHandled } from '@/app/lib/api-client';
import type { ContactMessage } from '@foldify/shared';

export function InboxView() {
  const toast = useToast();
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const applyData = useCallback((data: ContactMessage[]) => {
    setError(null);
    setMessages(data);
  }, []);

  const applyError = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Could not load the inbox.');
  }, []);

  useEffect(() => {
    let isStale = false;
    listContactMessages()
      .then((data) => {
        if (!isStale) applyData(data);
      })
      .catch((cause: unknown) => {
        if (!isStale) applyError(cause);
      });
    return () => {
      isStale = true;
    };
  }, [applyData, applyError]);

  const reload = useCallback(() => {
    listContactMessages().then(applyData).catch(applyError);
  }, [applyData, applyError]);

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
        <Card>
          <CardBody className="flex flex-col items-start gap-3">
            <Badge tone="danger">Problem</Badge>
            <p>{error}</p>
            <Button onClick={() => void reload()} variant="secondary" size="sm">
              Try again
            </Button>
          </CardBody>
        </Card>
      ) : messages === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index}>
              <CardBody className="flex flex-col gap-3">
                <Skeleton shape="title" />
                <Skeleton shape="text" lines={3} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardBody>
            <p>The inbox is empty. Nice.</p>
          </CardBody>
        </Card>
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
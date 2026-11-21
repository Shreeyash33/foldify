'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta } from '@/app/components/ui/Card';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { Select } from '@/app/components/ui/Select';
import { useToast } from '@/app/contexts/ToastContext';
import { listContactMessages, setContactArchived, setContactHandled } from '@/app/lib/api-client';
import { useFetchData } from '@/app/lib/hooks';
import type { ContactMessage } from '@foldify/shared';

type SortKey = 'newest' | 'oldest' | 'name' | 'subject';
type FilterKey = 'all' | 'open' | 'handled';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'subject', label: 'Subject A-Z' },
];

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'handled', label: 'Handled' },
];

const SORTERS: Record<SortKey, (a: ContactMessage, b: ContactMessage) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  subject: (a, b) => a.subject.localeCompare(b.subject),
};

interface MessageCardProps {
  message: ContactMessage;
  isExpanded: boolean;
  onToggleDetails: () => void;
  /** Footer rows differ between the inbox and the archived drawer. */
  actions: ReactNode;
}

function MessageCard({ message, isExpanded, onToggleDetails, actions }: MessageCardProps) {
  return (
    <Card>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDetails}
          aria-expanded={isExpanded}
          leftIcon={<span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>}
        >
          Details
        </Button>
      </div>

      {isExpanded ? (
        <>
          <CardBody>
            <p className="font-body text-base whitespace-pre-wrap break-words text-ink">{message.body}</p>
          </CardBody>
          <CardFooter className="justify-end">{actions}</CardFooter>
        </>
      ) : null}
    </Card>
  );
}

export function InboxView() {
  const toast = useToast();
  const { data: messages, error, reload } = useFetchData(
    listContactMessages,
    'Could not load the inbox.',
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');

  const allMessages = messages ?? [];

  const unarchived = allMessages.filter((message) => !message.isArchived);
  const archived = allMessages.filter((message) => message.isArchived);
  const visibleMessages = [...unarchived]
    .filter((message) =>
      filter === 'all' ? true : filter === 'open' ? !message.isHandled : message.isHandled,
    )
    .sort(SORTERS[sortBy]);

  const toggleDetails = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runOp = async (id: number, op: () => Promise<void>) => {
    setBusyId(id);
    try {
      await op();
      reload();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update the message.');
    } finally {
      setBusyId(null);
    }
  };

  const handleHandledToggle = async (message: ContactMessage) => {
    await runOp(message.id, async () => {
      await setContactHandled(message.id, !message.isHandled);
      if (!message.isHandled) {
        await setContactArchived(message.id, true);
      }
      toast.success(message.isHandled ? 'Marked as open.' : 'Marked as handled.');
    });
  };

  const handleArchive = async (message: ContactMessage) => {
    await runOp(message.id, async () => {
      await setContactArchived(message.id, true);
      toast.success('Archived.');
    });
  };

  const handleRestore = async (message: ContactMessage) => {
    await runOp(message.id, async () => {
      await setContactArchived(message.id, false);
      toast.success('Restored.');
    });
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
        <div className="flex flex-col gap-6">
          {unarchived.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-44">
                  <Select
                    label="Sort by"
                    hideLabel
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortKey)}
                    options={SORT_OPTIONS}
                  />
                </div>
                <div className="w-40">
                  <Select
                    label="Filter"
                    hideLabel
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as FilterKey)}
                    options={FILTER_OPTIONS}
                  />
                </div>
              </div>

              {visibleMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isExpanded={expandedIds.has(message.id)}
                  onToggleDetails={() => toggleDetails(message.id)}
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={busyId === message.id}
                        onClick={() => void handleArchive(message)}
                      >
                        Archive
                      </Button>
                      <Button
                        variant={message.isHandled ? 'secondary' : 'primary'}
                        size="sm"
                        isLoading={busyId === message.id}
                        onClick={() => void handleHandledToggle(message)}
                      >
                        {message.isHandled ? 'Reopen' : 'Mark handled'}
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          ) : null}

          {archived.length > 0 ? (
            <Card material="cardboard">
              <div className="border-b border-crease px-4 py-3 sm:px-5">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => setArchivedOpen((open) => !open)}
                  aria-expanded={archivedOpen}
                  leftIcon={<span aria-hidden="true">{archivedOpen ? '▾' : '▸'}</span>}
                >
                  <span className="font-display text-lg text-ink">Archived ({archived.length})</span>
                </Button>
              </div>

              {archivedOpen ? (
                <div className="flex flex-col gap-3 p-4 sm:p-5">
                  {archived.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      isExpanded={expandedIds.has(message.id)}
                      onToggleDetails={() => toggleDetails(message.id)}
                      actions={
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={busyId === message.id}
                            onClick={() => void handleRestore(message)}
                          >
                            Restore
                          </Button>
                          <Button
                            variant={message.isHandled ? 'secondary' : 'primary'}
                            size="sm"
                            isLoading={busyId === message.id}
                            onClick={() => void handleHandledToggle(message)}
                          >
                            {message.isHandled ? 'Reopen' : 'Mark handled'}
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
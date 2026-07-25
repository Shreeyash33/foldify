'use client';

import { useEffect, useState } from 'react';
import type { StatusResponse } from '@foldify/shared';
import { USE_MOCK, getStatus } from '@/app/lib/api-client';
import { Badge } from '@/app/components/ui/Badge';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { Skeleton } from '@/app/components/ui/Skeleton';

/**
 * Live output of GET /api/status.
 *
 * This is the proof that the two halves of the project actually talk to each
 * other. If this panel is green, the frontend, CORS, the Express router and
 * SQLite are all working together.
 */

const TONE: Record<string, 'accent' | 'danger' | 'neutral' | 'cardboard'> = {
  ok: 'accent',
  degraded: 'cardboard',
  down: 'danger',
  'not-implemented': 'neutral',
};

export function StatusPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unknown error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PaperSurface material="cardboard" elevation={2} className="w-full p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg text-ink">API status</h3>
        <Badge tone={USE_MOCK ? 'cardboard' : 'accent'}>
          {USE_MOCK ? 'mock data' : 'live'}
        </Badge>
      </div>

      <p className="mt-1 font-mono text-xs text-ink-muted">GET /api/status</p>

      <div className="mt-4">
        {error !== null ? (
          <p className="font-body text-sm text-beni">{error}</p>
        ) : status === null ? (
          <Skeleton shape="text" lines={4} />
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs sm:grid-cols-4">
              <Field label="version" value={status.version} />
              <Field label="env" value={status.environment} />
              <Field label="uptime" value={`${status.uptimeSeconds}s`} />
              <Field label="tables" value={String(status.database.tables)} />
              <Field label="db" value={status.database.connected ? 'connected' : 'offline'} />
              <Field label="foreign keys" value={status.database.foreignKeys ? 'ON' : 'OFF'} />
              <Field label="journal" value={status.database.journalMode} />
              <Field label="service" value={status.service} />
            </dl>

            <div className="flex flex-wrap gap-1.5">
              {Object.entries(status.modules).map(([name, health]) => (
                <Badge key={name} tone={TONE[health] ?? 'neutral'} size="sm">
                  {name}: {health}
                </Badge>
              ))}
            </div>

            {USE_MOCK ? (
              <p className="font-body text-sm text-ink-muted">
                This is mock data. Set NEXT_PUBLIC_USE_MOCK=false in frontend/.env.local and start
                the backend to see the real thing.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </PaperSurface>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="tracking-wider text-ink-muted uppercase">{label}</dt>
      <dd className="truncate text-ink">{value}</dd>
    </div>
  );
}

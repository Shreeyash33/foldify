'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BadgeTone } from '@/app/components/ui/Badge';
import type { Order, OrderStatus } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { PaperSurface } from '@/app/components/ui/PaperSurface';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { ThemeToggle } from '@/app/components/ui/ThemeToggle';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTheme } from '@/app/contexts/ThemeContext';
import {
  type FontSizeLevel,
  useFontSize,
} from '@/app/contexts/FontSizeContext';
import { useToast } from '@/app/contexts/ToastContext';
import { ApiClientError, listOrders } from '@/app/lib/api-client';
import { cn, formatDate, formatPrice } from '@/app/lib/utils';

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'neutral',
  paid: 'accent',
  processing: 'neutral',
  shipped: 'accent',
  delivered: 'accent',
  cancelled: 'danger',
  refunded: 'danger',
};

const FONT_SIZE_LEVELS: FontSizeLevel[] = ['sm', 'base', 'lg', 'xl', '2xl'];

const FONT_SIZE_LABEL: Record<FontSizeLevel, string> = {
  sm: 'Small',
  base: 'Default',
  lg: 'Large',
  xl: 'Extra large',
  '2xl': 'Largest',
};

type Tab = 'profile' | 'settings';

export function ProfileView() {
  const router = useRouter();
  const toast = useToast();
  const { user, isLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user === null) router.replace('/login?next=/profile');
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user === null) return;

    let isStale = false;

    listOrders()
      .then((result) => {
        if (!isStale) setOrders(result);
      })
      .catch((error: unknown) => {
        if (isStale) return;
        setOrdersError(
          error instanceof ApiClientError
            ? error.message
            : 'Your orders could not be loaded right now.',
        );
      });

    return () => {
      isStale = true;
    };
  }, [user]);

  async function handleLogout() {
    await logout();
    toast.success('Signed out.');
    router.replace('/');
  }

  if (isLoading || user === null) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-4">
          <Skeleton shape="title" />
          <Skeleton shape="text" lines={3} />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <ProfileTabs activeTab={activeTab} onChange={setActiveTab} onLogout={handleLogout} />

      <div className="min-w-0 flex-1">
        {activeTab === 'profile' ? (
          <ProfileTab
            name={user.name}
            email={user.email}
            role={user.role}
            joinedAt={user.createdAt}
            isAdmin={user.role === 'admin'}
            orders={orders}
            ordersError={ordersError}
          />
        ) : (
          <SettingsTab />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ TABS */

function ProfileTabs({
  activeTab,
  onChange,
  onLogout,
}: {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  onLogout: () => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <PaperSurface
      as="aside"
      material="cardboard"
      elevation={1}
      className="flex w-full flex-col gap-1 p-3 md:w-48"
    >
      <span className="px-2 pb-1 font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
        Account
      </span>

      <nav aria-label="Account" className="flex flex-col gap-0.5">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-cut-sm)] px-3',
                'font-body text-base text-ink',
                isActive ? 'surface-paper elevation-1' : undefined,
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 border-t border-cardboard-edge pt-2">
        <Button type="button" variant="ghost" size="sm" fullWidth onClick={onLogout}>
          Sign out
        </Button>
      </div>
    </PaperSurface>
  );
}

/* --------------------------------------------------------------- PROFILE */

function ProfileTab({
  name,
  email,
  role,
  joinedAt,
  isAdmin,
  orders,
  ordersError,
}: {
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  isAdmin: boolean;
  orders: Order[] | null;
  ordersError: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody className="flex flex-col gap-2">
          <CardTitle>{name}</CardTitle>
          <CardMeta>{email}</CardMeta>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cardboard" size="sm">
              {role}
            </Badge>
            <Badge tone="neutral" size="sm">
              Joined {formatDate(joinedAt)}
            </Badge>
          </div>
        </CardBody>

        {isAdmin ? (
          <CardFooter className="justify-between">
            <Button href="/admin" variant="secondary" size="sm">
              Admin
            </Button>
            <span />
          </CardFooter>
        ) : null}
      </Card>

      <OrderList orders={orders} error={ordersError} />
    </div>
  );
}

function OrderList({ orders, error }: { orders: Order[] | null; error: string | null }) {
  if (error !== null) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (orders === null) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <Skeleton shape="title" />
          <Skeleton shape="text" lines={2} />
        </CardBody>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <CardTitle>No orders yet</CardTitle>
          <Button href="/products" variant="primary" size="sm">
            Browse the shop
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Order #{order.id}</CardTitle>
              <CardMeta>{formatDate(order.createdAt)}</CardMeta>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
              <Badge tone="neutral">{formatPrice(order.totalMinor, order.currency)}</Badge>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- SETTINGS */

function SettingsTab() {
  const { theme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="flex flex-col gap-6">
      {/* Theme */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div>
            <CardTitle>Theme</CardTitle>
            <CardMeta>Choose between light and dark.</CardMeta>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="font-body text-sm text-ink-muted">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
            <ThemeToggle />
          </div>
        </CardBody>
      </Card>

      {/* Font size */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div>
            <CardTitle>Text size</CardTitle>
            <CardMeta>Increase or decrease the size of text on the site.</CardMeta>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-body text-sm text-ink">A</span>
              <span className="font-body text-sm text-ink-muted">
                {FONT_SIZE_LABEL[fontSize]} — {FONT_SIZE_LEVELS.indexOf(fontSize) + 1} of 5
              </span>
              <span className="font-body text-2xl text-ink">A</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={fontSize === 'sm'}
                onClick={() => {
                  const prev = FONT_SIZE_LEVELS[FONT_SIZE_LEVELS.indexOf(fontSize) - 1];
                  if (prev !== undefined) setFontSize(prev);
                }}
              >
                Smaller
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={fontSize === '2xl'}
                onClick={() => {
                  const next = FONT_SIZE_LEVELS[FONT_SIZE_LEVELS.indexOf(fontSize) + 1];
                  if (next !== undefined) setFontSize(next);
                }}
              >
                Larger
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fontSize === 'base'}
                onClick={() => setFontSize('base')}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

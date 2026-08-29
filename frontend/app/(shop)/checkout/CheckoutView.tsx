'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter, CardMeta, CardTitle } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart } from '@/app/contexts/CartContext';
import { useToast } from '@/app/contexts/ToastContext';
import { ApiClientError, createOrder } from '@/app/lib/api-client';
import { formatPrice } from '@/app/lib/utils';

export function CheckoutView() {
  const router = useRouter();
  const toast = useToast();
  const { user, isLoading } = useAuth();
  const { items, subtotalMinor, isEmpty, clear } = useCart();

  /**
   * Null means "untouched", which is what lets the account name show through
   * as a default without an effect copying it into state — and still lets the
   * shopper clear the field, which a plain prefill would fight.
   */
  const [typedName, setTypedName] = useState<string | null>(null);
  const shippingName = typedName ?? user?.name ?? '';

  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user === null) router.replace('/login?next=/checkout');
  }, [isLoading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      // Ids and quantities only. The server reads every price from its own
      // products table — a total sent from here would be a total we chose.
      const { order, payment } = await createOrder({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingCity,
      });

      // Only clear once the order actually came back — a failed request must
      // not lose someone's basket.
      clear();
      toast.success('Order placed.');

      /*
       * The simulated gateway redirects back into this app and its reference
       * alone is not enough to verify against — that needs the order id. A real
       * gateway will hand back an absolute URL of its own instead, which is a
       * full page departure rather than a client-side route change.
       */
      if (payment.redirectUrl.startsWith('/')) {
        const separator = payment.redirectUrl.includes('?') ? '&' : '?';
        router.replace(`${payment.redirectUrl}${separator}order=${order.id}`);
      } else {
        window.location.assign(payment.redirectUrl);
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.fields !== undefined) setFieldErrors(error.fields);
        else setFormError(error.message);
      } else {
        setFormError('The order could not be placed. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  if (isLoading || user === null) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-4">
          <Skeleton shape="title" />
          <Skeleton shape="text" lines={4} />
        </CardBody>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <CardTitle>There is nothing to check out</CardTitle>
          <Button href="/products" variant="primary">
            Browse the shop
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <Card className="lg:flex-1">
        <form onSubmit={handleSubmit} noValidate>
          <CardBody className="flex flex-col gap-4">
            {formError !== null ? (
              <div className="flex flex-col gap-2" role="alert">
                <Badge tone="danger" className="self-start">
                  Problem
                </Badge>
                <p>{formError}</p>
              </div>
            ) : null}

            <Input
              label="Full name"
              autoComplete="name"
              value={shippingName}
              onChange={(event) => setTypedName(event.target.value)}
              error={fieldErrors.shippingName}
              required
            />
            <Input
              label="Phone"
              type="tel"
              autoComplete="tel"
              value={shippingPhone}
              onChange={(event) => setShippingPhone(event.target.value)}
              error={fieldErrors.shippingPhone}
              required
            />
            <Input
              label="Address"
              autoComplete="street-address"
              value={shippingAddress}
              onChange={(event) => setShippingAddress(event.target.value)}
              error={fieldErrors.shippingAddress}
              required
            />
            <Input
              label="City"
              autoComplete="address-level2"
              value={shippingCity}
              onChange={(event) => setShippingCity(event.target.value)}
              error={fieldErrors.shippingCity}
              required
            />

            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} fullWidth>
              Place order
            </Button>
          </CardBody>
        </form>
      </Card>

      <Card material="cardboard" className="lg:w-80 lg:shrink-0">
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Order summary</CardTitle>

          {items.map((item) => (
            <div key={item.productId} className="flex items-baseline justify-between gap-3">
              <CardMeta>
                {item.name} × {item.quantity}
              </CardMeta>
              <CardMeta>{formatPrice(item.unitPriceMinor * item.quantity)}</CardMeta>
            </div>
          ))}
        </CardBody>

        <CardFooter className="justify-between">
          <CardMeta>Subtotal</CardMeta>
          <Badge tone="accent">{formatPrice(subtotalMinor)}</Badge>
        </CardFooter>
      </Card>
    </div>
  );
}

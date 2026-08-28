'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardFooter } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { ApiClientError } from '@/app/lib/api-client';

export type AuthMode = 'login' | 'register';

const FALLBACK_DESTINATION = '/profile';

/**
 * `?next=` comes from the URL, so it is attacker-controlled. Anything other
 * than a single-slash relative path could send a signed-in user to another
 * origin, so everything else falls back to the profile page.
 */
function safeDestination(raw: string | null): string {
  if (raw === null) return FALLBACK_DESTINATION;
  if (!raw.startsWith('/') || raw.startsWith('//')) return FALLBACK_DESTINATION;
  return raw;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isRegister = mode === 'register';

  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, isLoading, login, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = safeDestination(searchParams.get('next'));

  // Someone who is already signed in has nothing to do on these two pages.
  useEffect(() => {
    if (!isLoading && user !== null) router.replace(destination);
  }, [isLoading, user, destination, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    // The API takes one password; matching the confirmation is a client concern.
    if (isRegister && password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Both passwords must match.' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);

      toast.success(isRegister ? 'Account created. Welcome to Foldify.' : 'Signed in.');
      router.replace(destination);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.fields !== undefined) setFieldErrors(error.fields);
        else setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  // Honour isLoading from useAuth — rendering the form before the session check
  // resolves flashes a sign-in form at someone who is already signed in.
  if (isLoading || user !== null) {
    return (
      <Card className="w-full">
        <CardBody className="flex flex-col gap-4">
          <Skeleton shape="title" />
          <Skeleton shape="text" lines={3} />
          <Skeleton shape="block" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full">
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

          {isRegister ? (
            <Input
              label="Name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors.name}
              required
            />
          ) : null}

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            hint={isRegister ? 'At least 8 characters.' : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />

          {isRegister ? (
            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={fieldErrors.confirmPassword}
              required
            />
          ) : null}

          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} fullWidth>
            {isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </CardBody>

        <CardFooter>
          {isRegister ? (
            <p>
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          ) : (
            <p>
              New here? <Link href="/register">Create an account</Link>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

/** Fallback for the Suspense boundary each page wraps this in. */
export function AuthFormFallback() {
  return (
    <Card className="w-full">
      <CardBody className="flex flex-col gap-4">
        <Skeleton shape="title" />
        <Skeleton shape="text" lines={3} />
        <Skeleton shape="block" />
      </CardBody>
    </Card>
  );
}

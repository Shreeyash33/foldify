'use client';

import { useState, type FormEvent } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardTitle } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Textarea } from '@/app/components/ui/Textarea';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { ApiClientError, sendContactMessage } from '@/app/lib/api-client';

export function ContactView() {
  const toast = useToast();
  const { user } = useAuth();

  /**
   * Null means "untouched", so a signed-in visitor's name and email show
   * through as defaults while the fields stay clearable — same deal as the
   * shipping name on checkout.
   */
  const [typedName, setTypedName] = useState<string | null>(null);
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const name = typedName ?? user?.name ?? '';
  const email = typedEmail ?? user?.email ?? '';

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await sendContactMessage({ name, email, subject, body });

      setTypedName(null);
      setTypedEmail(null);
      setSubject('');
      setBody('');
      toast.success('Message sent. We read everything that lands in the inbox.');
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.fields !== undefined) setFieldErrors(error.fields);
        else setFormError(error.message);
      } else {
        setFormError('The message could not be sent. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <Card className="lg:flex-1">
        <form onSubmit={handleSubmit} noValidate>
          <CardBody className="flex flex-col gap-4">
            <CardTitle>Send us a message</CardTitle>

            {formError !== null ? (
              <div className="flex flex-col gap-2" role="alert">
                <Badge tone="danger" className="self-start">
                  Problem
                </Badge>
                <p>{formError}</p>
              </div>
            ) : null}

            <Input
              label="Name"
              autoComplete="name"
              value={name}
              onChange={(event) => setTypedName(event.target.value)}
              error={fieldErrors.name}
              required
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setTypedEmail(event.target.value)}
              error={fieldErrors.email}
              required
            />
            <Input
              label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              error={fieldErrors.subject}
              required
            />
            <Textarea
              label="Message"
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              error={fieldErrors.body}
              required
            />

            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} fullWidth>
              Send message
            </Button>
          </CardBody>
        </form>
      </Card>

      <Card material="cardboard" className="lg:w-80 lg:shrink-0">
        <CardBody className="flex flex-col gap-3">
          <CardTitle>What happens next</CardTitle>
          <p>
            Your message lands straight in the admin inbox, where each one is
            read and marked handled as it is answered.
          </p>
          <p>
            Orders, refunds and delivery questions get the fastest reply if you
            mention the order number.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
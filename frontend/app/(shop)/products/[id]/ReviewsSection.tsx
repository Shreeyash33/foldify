'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { ProductDetail } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody, CardTitle } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { Textarea } from '@/app/components/ui/Textarea';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { ApiClientError, createReview, getProduct } from '@/app/lib/api-client';
import { formatDate } from '@/app/lib/utils';

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: `${value} star${value === 1 ? '' : 's'}`,
}));

/**
 * The reviews live in the product's cached shell, but this section deliberately
 * reads them afresh on every visit, the same way LivePricing reads the price
 * afresh: a page cached for an hour must not be the thing that tells someone
 * whether they have already reviewed a model. The same fresh read is what lets
 * a just-posted review appear immediately instead of after the cache drains.
 */
export function ReviewsSection({ slug }: { slug: string }) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isStale = false;

    getProduct(slug)
      .then((result) => {
        if (!isStale) setDetail(result);
      })
      .catch((fetchError: unknown) => {
        if (isStale) return;
        setError(
          fetchError instanceof ApiClientError
            ? fetchError.message
            : 'Reviews could not be loaded right now.',
        );
      });

    return () => {
      isStale = true;
    };
  }, [slug]);

  async function reload() {
    setError(null);
    setDetail(null);
    try {
      setDetail(await getProduct(slug));
    } catch (fetchError) {
      setError(
        fetchError instanceof ApiClientError
          ? fetchError.message
          : 'Reviews could not be loaded right now.',
      );
    }
  }

  if (detail === null) {
    return (
      <div className="flex flex-col gap-3">
        {error !== null ? (
          <ErrorCard message={error} onRetry={() => void reload()} />
        ) : (
          <Skeleton shape="text" lines={3} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{detail.averageRating.toFixed(1)} average</Badge>
        <Badge tone="neutral">
          {detail.reviewCount} review{detail.reviewCount === 1 ? '' : 's'}
        </Badge>
      </div>

      {detail.reviews.length === 0 ? (
        <p>No reviews yet. Fold it first and tell everyone how it went.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {detail.reviews.map((review) => (
            <Card key={review.id}>
              <CardBody className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{review.authorName ?? 'A folder'}</CardTitle>
                  <Badge tone="neutral" size="sm">
                    {review.rating} / 5
                  </Badge>
                  <Badge tone="neutral" size="sm">
                    {formatDate(review.createdAt)}
                  </Badge>
                </div>
                <p>{review.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ReviewForm slug={slug} onSubmitted={reload} />
    </div>
  );
}

function ReviewForm({ slug, onSubmitted }: { slug: string; onSubmitted: () => void }) {
  const toast = useToast();
  const { user, isLoading } = useAuth();

  const [rating, setRating] = useState('5');
  const [body, setBody] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) return null;

  if (user === null) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <CardTitle>Folded it?</CardTitle>
          <p>Sign in to rate this model and tell everyone how it went.</p>
          <Button href={`/login?next=/products/${encodeURIComponent(slug)}`} variant="secondary" size="sm">
            Sign in to review
          </Button>
        </CardBody>
      </Card>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await createReview(slug, { rating: Number.parseInt(rating, 10) as 1 | 2 | 3 | 4 | 5, body });

      setRating('5');
      setBody('');
      toast.success('Review posted. Thank you!');
      onSubmitted();
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.fields !== undefined) setFieldErrors(error.fields);
        else setFormError(error.message);
      } else {
        setFormError('The review could not be posted. Please try again.');
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate>
        <CardBody className="flex flex-col gap-4">
          <CardTitle>Write a review</CardTitle>

          {formError !== null ? (
            <div className="flex flex-col gap-2" role="alert">
              <Badge tone="danger" className="self-start">
                Problem
              </Badge>
              <p>{formError}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <Select
              label="Rating"
              options={RATING_OPTIONS}
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              error={fieldErrors.rating}
              className="sm:w-40"
            />
            <Textarea
              label="Your review"
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              error={fieldErrors.body}
              placeholder="How did the fold go?"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} fullWidth>
            Post review
          </Button>
        </CardBody>
      </form>
    </Card>
  );
}
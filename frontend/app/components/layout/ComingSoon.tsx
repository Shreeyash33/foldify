import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Container } from './Container';
import { PageHeader } from './PageHeader';

/**
 * Every route in the sitemap exists from day one, so nobody hits a 404 while
 * the pages are being built. Replace the whole file when you build the real page.
 *
 * `owner` and `notes` are there so the placeholder says who is building it and
 * what it has to do — a placeholder that just says "coming soon" tells the
 * next person nothing.
 */

export interface ComingSoonProps {
  title: string;
  eyebrow?: string;
  description?: string;
  /** What the finished page needs to do. */
  notes?: string[];
  /**
   * Set false when the page already sits inside a Container — the admin
   * layout provides its own, and nesting two would double the padding.
   */
  contained?: boolean;
}

export function ComingSoon({
  title,
  eyebrow,
  description,
  notes,
  contained = true,
}: ComingSoonProps) {
  const Wrapper = contained ? Container : 'div';

  return (
    <Wrapper>
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description={description ?? 'This page is a placeholder in the initial scaffold.'}
        actions={<Badge tone="cardboard">Coming soon</Badge>}
      />

      <Card className="mb-16">
        <CardBody className="flex flex-col gap-4">
          <p className="font-body text-ink-muted">
            The route, layout and design system are in place. The page itself is next.
          </p>

          {notes !== undefined ? (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">
                What this page needs
              </span>
              <ul className="flex list-disc flex-col gap-1 pl-5 font-body text-ink">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button href="/" variant="secondary" size="sm">
              Back to the component showcase
            </Button>
          </div>
        </CardBody>
      </Card>
    </Wrapper>
  );
}

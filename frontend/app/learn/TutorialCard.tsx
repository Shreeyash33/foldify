import Link from 'next/link';
import type { Tutorial } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import {
  Card,
  CardBody,
  CardMedia,
  CardMeta,
  CardTitle,
} from '@/app/components/ui/Card';
import { formatDuration } from '@/app/lib/utils';

/**
 * A tutorial card. Same shape as ProductCard: difficulty and length sit in
 * Badges (mono data labels), and the whole card links to the fold page.
 */
export function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  return (
    <Card interactive className="h-full">
      <Link href={`/learn/${tutorial.slug}`} className="flex h-full flex-col">
        <CardMedia src={tutorial.coverImageUrl} alt={tutorial.title} />

        <CardBody className="flex flex-col gap-2">
          <CardTitle>{tutorial.title}</CardTitle>
          <CardMeta>{tutorial.summary}</CardMeta>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cardboard" size="sm">
              {tutorial.difficulty}
            </Badge>
            <Badge tone="neutral" size="sm">
              {formatDuration(tutorial.estimatedMinutes)}
            </Badge>
          </div>
        </CardBody>
      </Link>
    </Card>
  );
}
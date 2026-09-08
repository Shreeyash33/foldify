import type { Tutorial } from '@foldify/shared';
import { Badge } from '@/app/components/ui/Badge';
import { CardMeta } from '@/app/components/ui/Card';
import { MediaCard } from '@/app/components/cards/MediaCard';
import { formatDuration } from '@/app/lib/utils';

/**
 * A tutorial card. Same shape as ProductCard: difficulty and length sit in
 * Badges (mono data labels), and the whole card links to the fold page.
 */
export function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  return (
    <MediaCard
      href={`/learn/${tutorial.slug}`}
      imageSrc={tutorial.coverImageUrl}
      imageAlt={tutorial.title}
      title={tutorial.title}
    >
      <CardMeta>{tutorial.summary}</CardMeta>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="cardboard" size="sm">
          {tutorial.difficulty}
        </Badge>
        <Badge tone="neutral" size="sm">
          {formatDuration(tutorial.estimatedMinutes)}
        </Badge>
      </div>
    </MediaCard>
  );
}

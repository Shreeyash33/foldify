import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Container } from '@/app/components/layout/Container';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PageHeader } from '@/app/components/layout/PageHeader';
import type { Tutorial } from '@foldify/shared';
import { getTutorialList, getTutorialShell } from '@/app/lib/catalogue';
import { FoldPlayer } from './FoldPlayer';

/**
 * The tutorial page — the fold player, hard at the centre.
 *
 * The player is a client component: it owns "which step am I on" and renders
 * the full studio layout (left tutorial list, centre canvas with pagination,
 * right step description). This server component only fetches the data —
 * the current tutorial and, for the sidebar, every other published one —
 * then hands both over. The CraftMaker animation slot stays a placeholder
 * inside the player until the CraftFile format exists.
 *
 * `params` is read inside the boundary rather than in the page body because
 * `cacheComponents` treats an awaited param on a route with no static params
 * as uncached dynamic access, which would block the whole route from
 * prerendering.
 */

async function TutorialContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let tutorial: Tutorial | null;
  try {
    tutorial = await getTutorialShell(slug);
  } catch {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">Problem</Badge>
          <p>This tutorial could not be loaded right now. Please try again shortly.</p>
        </CardBody>
      </Card>
    );
  }

  if (tutorial === null) notFound();

  // The left-side list of every other fold. A failure here is not fatal —
  // it falls back to an empty list and the player simply hides the sidebar.
  let tutorials: Tutorial[] = [];
  try {
    tutorials = await getTutorialList();
  } catch {
    tutorials = [];
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title sits above the canvas, as specified. */}
      <PageHeader
        title={tutorial.title}
        eyebrow="Learn"
        description={tutorial.summary}
      />

      <FoldPlayer tutorial={tutorial} tutorials={tutorials} />
    </div>
  );
}

/**
 * No `generateStaticParams` — baking one HTML file per slug would make the
 * build depend on the API being reachable, and the shell cache in
 * lib/catalogue.ts already gives the shared-across-visitors win. Same deal as
 * the product detail route.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const tutorial = await getTutorialShell(slug);
    if (tutorial === null) return { title: 'Tutorial not found' };
    return { title: tutorial.title, description: tutorial.summary };
  } catch {
    return { title: 'Tutorial' };
  }
}

function TutorialSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton shape="title" />
      <Skeleton shape="text" lines={3} />
      <Skeleton shape="block" />
    </div>
  );
}

export default function TutorialPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Container width="wide" className="flex flex-col gap-6 pb-16">
      <Suspense fallback={<TutorialSkeleton />}>
        <TutorialContent params={params} />
      </Suspense>
    </Container>
  );
}
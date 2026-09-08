import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardBody, CardFooter, CardMedia, CardTitle } from '@/app/components/ui/Card';

export interface MediaCardProps {
  href: string;
  target?: string;
  imageSrc: string | null;
  imageAlt: string;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function MediaCard({
  href,
  target,
  imageSrc,
  imageAlt,
  title,
  children,
  footer,
}: MediaCardProps) {
  return (
    <Card interactive className="h-full">
      <Link href={href} target={target} className="flex h-full flex-col">
        <CardMedia src={imageSrc} alt={imageAlt} />

        <CardBody className="flex flex-col gap-2">
          <CardTitle>{title}</CardTitle>
          {children}
        </CardBody>

        {footer !== undefined ? <CardFooter>{footer}</CardFooter> : null}
      </Link>
    </Card>
  );
}

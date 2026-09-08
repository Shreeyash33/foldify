import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Container } from '@/app/components/layout/Container';

export default function NotFound() {
  return (
    <Container width="narrow" className="flex flex-col items-stretch gap-6 py-16">
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Badge tone="danger">404</Badge>
          <h2 className="font-display text-2xl text-ink">Page not found</h2>
          <p>This page doesn&apos;t exist, or it has been folded away.</p>
          <Button href="/" variant="secondary" size="sm">
            Back home
          </Button>
        </CardBody>
      </Card>
    </Container>
  );
}

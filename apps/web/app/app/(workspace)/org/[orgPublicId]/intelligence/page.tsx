export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@property-studio/ui';

export const metadata = { title: 'Organization intelligence' };

export default async function OrganizationIntelligencePage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligence"
        description="Market and AI tools for this organization. Metrics appear only when backed by live APIs."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI workspace</CardTitle>
            <CardDescription>
              Assistant, search, match, valuation, and compare — shared workspace tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/app/ai">Open AI tools</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/ai/assistant">Assistant</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/ai/compare">Compare</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Catalog context</CardTitle>
            <CardDescription>
              Review published properties and projects, then open intelligence on public detail
              pages when coverage exists.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/org/${orgPublicId}/properties`}>Properties</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/ai/valuation">Valuation</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/ai/match">Match</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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

import { AiSubnav } from '@/components/ai/ai-subnav';

export const metadata = { title: 'AI tools' };

const TOOLS = [
  {
    href: '/app/ai/chat',
    title: 'AI Copilot',
    description:
      'Persistent conversations with tool cards, confirmation gates, and Phase 11 tools.',
  },
  {
    href: '/app/ai/assistant',
    title: 'Property Assistant',
    description: 'Ask questions grounded in verified catalog and intelligence data.',
  },
  {
    href: '/app/ai/search',
    title: 'Natural language search',
    description: 'Describe what you need; results come from live property listings only.',
  },
  {
    href: '/app/ai/match',
    title: 'Property match',
    description: 'Match budget, city, and configuration against the catalog.',
  },
  {
    href: '/app/ai/valuation',
    title: 'Valuation',
    description: 'Request an estimate when sufficient verified market data exists.',
  },
  {
    href: '/app/ai/compare',
    title: 'Compare',
    description: 'Compare two to five properties or projects side by side.',
  },
] as const;

export default function AiOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligence & AI"
        description="Tools that surface verified market and catalog data. Empty states appear when coverage is insufficient — no invented metrics."
      />
      <AiSubnav />
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Card key={tool.href}>
            <CardHeader>
              <CardTitle>{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={tool.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

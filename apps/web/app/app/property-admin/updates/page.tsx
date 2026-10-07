import Link from 'next/link';
import { Button, EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Construction updates' };

export default function PropertyAdminUpdatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Construction updates"
        description="Construction progress is managed from the developer project workspace. Property-admin assignments stay read-focused for inventory tasks."
      />
      <EmptyState
        title="Managed in developer project workspace"
        description="Create and publish construction updates from your organization project detail (Overview → Construction). Property-admin roles do not receive construction-update:create by default."
      />
      <Button asChild variant="outline">
        <Link href="/app">Open workspace</Link>
      </Button>
    </div>
  );
}

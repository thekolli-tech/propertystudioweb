import { EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';
import { Button } from '@property-studio/ui';

export const metadata = { title: 'Properties' };

export default function PropertiesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Properties"
        description="Public property catalog. Listings will appear here when the catalog domain is available."
      />
      <EmptyState
        title="No properties listed yet"
        description="The property catalog is not populated in this phase. Public listing pages are ready for future API data."
        action={
          <Button asChild variant="outline">
            <Link href="/requirements">Post a requirement</Link>
          </Button>
        }
      />
    </main>
  );
}

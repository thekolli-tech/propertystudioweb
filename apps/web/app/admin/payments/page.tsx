import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Payments' };

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Platform payment operations." />
      <EmptyState
        title="Payments not available yet"
        description="Payment and subscription APIs are intentionally deferred. No fabricated revenue metrics are shown."
      />
    </div>
  );
}

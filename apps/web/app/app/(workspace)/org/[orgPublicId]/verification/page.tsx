import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Verification' };

export default function OrganizationVerificationPage() {
  return (
    <div>
      <PageHeader
        title="Verification"
        description="Agency professional verification is not implemented in this phase."
      />
      <EmptyState
        title="Professional verification required"
        description="Verification is required before professional marketplace access. No verification badges are shown until a real verification record exists."
      />
    </div>
  );
}

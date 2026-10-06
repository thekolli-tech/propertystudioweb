export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { RequirementWizardForm } from '@/components/requirements/requirement-wizard-form';

export const metadata = { title: 'New requirement' };

export default function NewRequirementPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New requirement"
        description="Five steps to capture demand. Private notes never appear on the public marketplace."
      />
      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <RequirementWizardForm />
      </div>
    </div>
  );
}

import type { BroadcastProjectPresentation } from '@property-studio/contracts';
import { EmptyState, PageHeader } from '@property-studio/ui';

import { PresentationSection } from './presentation-section';

export type ProjectPresentationProps = {
  presentation: BroadcastProjectPresentation | null;
  unavailable?: boolean;
  unavailableMessage?: string;
};

export function ProjectPresentation({
  presentation,
  unavailable = false,
  unavailableMessage = 'Project presentation could not be loaded for this session.',
}: ProjectPresentationProps) {
  if (unavailable || !presentation) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project presentation"
          description="Broadcast view for a development project."
        />
        <EmptyState title="Presentation unavailable" description={unavailableMessage} />
      </div>
    );
  }

  if (presentation.sections.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={presentation.name} description={presentation.projectPublicId} />
        <EmptyState
          title="Insufficient presentation data"
          description="No broadcast sections are available for this project yet. Charts and metrics appear only from live APIs."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={presentation.name} description={presentation.projectPublicId} />
      <div className="grid gap-5 lg:grid-cols-2">
        {presentation.sections.map((section) => (
          <PresentationSection key={section.id} section={section}>
            {section.available && section.data ? (
              <dl className="space-y-2 text-[calc(0.9rem*var(--broadcast-scale))]">
                {Object.entries(section.data).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2 last:border-0"
                  >
                    <dt className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </dt>
                    <dd className="font-medium text-foreground">
                      {value == null
                        ? '—'
                        : typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </PresentationSection>
        ))}
      </div>
    </div>
  );
}

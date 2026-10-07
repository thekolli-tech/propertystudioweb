export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AskAiLink } from '@/components/ai/ask-ai-link';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, requireSessionUser } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';
import { Badge, ErrorState, PageHeader } from '@property-studio/ui';
import { Breadcrumbs } from '@property-studio/ui';
import Link from 'next/link';

export const metadata = { title: 'Project' };

type PageProps = {
  params: Promise<{ orgPublicId: string; publicId: string }>;
};

export default async function OrganizationProjectDetailPage({ params }: PageProps) {
  const { orgPublicId, publicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization') || !isPublicIdForKind(publicId, 'project')) {
    notFound();
  }

  await requireSessionUser();
  const client = createServerApiClient(await getRequestCookieHeader());

  try {
    const project = await client.getProject(publicId);
    if (project.organizationPublicId !== orgPublicId) {
      notFound();
    }

    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={
            <Breadcrumbs
              linkComponent={Link}
              items={[
                { label: 'Projects', href: `/app/org/${orgPublicId}/projects` },
                { label: project.name },
              ]}
            />
          }
          title={project.name}
          description={project.description ?? 'Project details for your developer catalog.'}
        />
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{project.publicId}</Badge>
          <Badge variant="outline">{project.lifecycleStatus}</Badge>
          <Badge variant="outline">{project.projectType.replaceAll('_', ' ')}</Badge>
          <AskAiLink
            label="Ask AI about this project"
            hints={{
              projectPublicId: project.publicId,
              organizationPublicId: orgPublicId,
              focus: 'project',
              route: `/app/org/${orgPublicId}/projects/${project.publicId}`,
            }}
          />
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-medium">
              {[project.locality, project.city, project.state].filter(Boolean).join(', ') ||
                'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Properties</dt>
            <dd className="font-medium">{project.propertyCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Starting price</dt>
            <dd className="font-medium">
              {project.startingPriceMinor
                ? new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: project.currency,
                    maximumFractionDigits: 0,
                  }).format(Number(project.startingPriceMinor) / 100)
                : 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Published</dt>
            <dd className="font-medium">{project.publishedAt ?? 'Not published'}</dd>
          </div>
        </dl>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Media foundation</h2>
          <p className="text-sm text-muted-foreground">
            {project.media.length
              ? `${project.media.length} media asset(s) linked.`
              : 'No media assets linked yet. Object keys are stored via the storage abstraction.'}
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Document foundation</h2>
          <p className="text-sm text-muted-foreground">
            {project.documents.length
              ? `${project.documents.length} document(s) linked.`
              : 'No documents linked yet.'}
          </p>
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiClientError) {
      return <ErrorState title="Unable to load project" message={error.message} />;
    }
    throw error;
  }
}

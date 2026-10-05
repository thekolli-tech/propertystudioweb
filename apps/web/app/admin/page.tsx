import Link from 'next/link';
import { Building2, FolderKanban, Home, Users } from 'lucide-react';
import {
  Button,
  ChartContainer,
  DashboardSection,
  EmptyState,
  PageHeader,
  StatCard,
} from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin dashboard' };

export default async function AdminHomePage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let organizationCount: number | null = null;
  try {
    organizationCount = (await client.listOrganizations()).organizations.length;
  } catch {
    organizationCount = null;
  }

  const projects = await client
    .listPublicProjects({ limit: 5 })
    .catch(() => ({ projects: [], nextCursor: null }));
  const properties = await client
    .listPublicProperties({ limit: 5 })
    .catch(() => ({ properties: [], nextCursor: null }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform overview"
        description="Super Admin console. Metrics only appear when backed by live APIs — never fabricated platform totals."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={null}
          unavailable
          hint="Platform-wide user count API is not available yet."
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Organizations"
          value={organizationCount ?? '—'}
          unavailable={organizationCount === null}
          hint="Count from organizations you can list with the current session."
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Published projects"
          value={projects.projects.length}
          hint="Sample of public projects (not a global warehouse total)."
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <StatCard
          label="Published properties"
          value={properties.properties.length}
          hint="Sample of public properties from discovery APIs."
          icon={<Home className="h-4 w-4" />}
        />
      </div>

      <DashboardSection
        title="Recent public catalog"
        description="Live published records only."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/catalog">Open catalog shell</Link>
          </Button>
        }
      >
        {projects.projects.length === 0 && properties.properties.length === 0 ? (
          <EmptyState
            title="No published catalog activity"
            description="When organizations publish projects and properties, recent public records will surface here."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Projects</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {projects.projects.map((project) => (
                  <li key={project.publicId} className="flex justify-between gap-3">
                    <span className="truncate font-medium">{project.name}</span>
                    <span className="text-muted-foreground">{project.publicId}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Properties</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {properties.properties.map((property) => (
                  <li key={property.publicId} className="flex justify-between gap-3">
                    <span className="truncate font-medium">{property.title}</span>
                    <span className="text-muted-foreground">{property.publicId}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DashboardSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          title="Platform growth"
          description="Time-series metrics require a dedicated analytics API."
          unavailable
        />
        <ChartContainer
          title="User distribution"
          description="Role distribution charts are not fabricated from partial samples."
          unavailable
        />
      </div>

      <DashboardSection title="System" description="Operational foundations.">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Audit', href: '/admin/audit', copy: 'Audit navigation shell.' },
            { title: 'Moderation', href: '/admin/moderation', copy: 'Moderation placeholder.' },
            { title: 'Payments', href: '/admin/payments', copy: 'Not available yet.' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}

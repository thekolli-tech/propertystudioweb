export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Building2, MapPinned, ShieldCheck, UsersRound } from 'lucide-react';
import {
  Button,
  DashboardSection,
  EmptyState,
  ProjectCard,
  PropertyCard,
} from '@property-studio/ui';

import { HeroSearch } from '@/components/public/hero-search';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { createServerApiClient } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';

const TRUST = [
  {
    title: 'Verified developers',
    description: 'Organization profiles with public IDs and transparent catalog ownership.',
    icon: ShieldCheck,
  },
  {
    title: 'Premium locations',
    description: 'Structured city, locality, and micro-market filters — not fake pin maps.',
    icon: MapPinned,
  },
  {
    title: 'Transparent listings',
    description: 'Published properties only. Draft inventory stays private by design.',
    icon: Building2,
  },
  {
    title: 'Modern communities',
    description: 'Community foundation ready for residents, owners, and updates.',
    icon: UsersRound,
  },
] as const;

export default async function HomePage() {
  const user = await getSessionUser();
  const client = createServerApiClient();

  const [projects, properties] = await Promise.all([
    client.listPublicProjects({ limit: 6 }).catch(() => ({ projects: [], nextCursor: null })),
    client.listPublicProperties({ limit: 6 }).catch(() => ({ properties: [], nextCursor: null })),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader authenticated={Boolean(user)} />
      <main className="flex-1">
        <section className="ps-hero-surface relative overflow-hidden">
          <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:py-24">
            <div className="max-w-3xl text-white">
              <p className="text-sm font-medium tracking-[0.22em] text-[hsl(var(--premium))] uppercase">
                Property Studio
              </p>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Find your perfect <span className="text-[hsl(var(--premium))]">property</span> in
                India
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
                Intelligent discovery for projects and homes — powered by live catalog data, never
                fabricated inventory.
              </p>
            </div>
            <HeroSearch />
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {TRUST.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5 ps-card-elevated"
            >
              <item.icon className="h-5 w-5 text-[hsl(var(--premium))]" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </section>

        <div className="mx-auto w-full max-w-7xl space-y-14 px-4 pb-16 sm:px-6">
          <DashboardSection
            title="Featured projects"
            description="Published developer projects from the live catalog."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">View all</Link>
              </Button>
            }
          >
            {projects.projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Published projects will appear here when developers release them."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {projects.projects.map((project) => (
                  <ProjectCard
                    key={project.publicId}
                    variant="row"
                    linkComponent={Link}
                    href={`/projects/${project.publicId}`}
                    name={project.name}
                    publicId={project.publicId}
                    developerName={project.developerDisplayName}
                    location={[project.locality, project.city].filter(Boolean).join(', ')}
                    startingPriceMinor={project.startingPriceMinor}
                    currency={project.currency}
                  />
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Latest properties"
            description="Only intentionally published listings are shown."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/properties">Browse properties</Link>
              </Button>
            }
          >
            {properties.properties.length === 0 ? (
              <EmptyState
                title="No properties found"
                description="Public listings appear after a developer organization publishes them."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.properties.map((property) => (
                  <PropertyCard
                    key={property.publicId}
                    linkComponent={Link}
                    href={`/properties/${property.publicId}`}
                    title={property.title}
                    publicId={property.publicId}
                    location={[property.locality, property.city].filter(Boolean).join(', ')}
                    projectLabel={property.projectPublicId}
                    configuration={property.configuration}
                    bedrooms={property.bedrooms}
                    priceMinor={property.priceMinor}
                    currency={property.currency}
                    availabilityStatus={property.availabilityStatus}
                  />
                ))}
              </div>
            )}
          </DashboardSection>

          <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Communities',
                href: '/communities',
                copy: 'Explore community foundations for projects.',
              },
              {
                title: 'Media',
                href: '/media',
                copy: 'Browse media metadata when assets are linked.',
              },
              {
                title: 'Post a requirement',
                href: '/requirements',
                copy: 'Share what you are looking for.',
              },
              {
                title: 'For professionals',
                href: user ? '/app' : '/register',
                copy: user ? 'Open your workspace.' : 'Create a developer or agency account.',
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-border/80 bg-background p-4 transition-colors hover:border-foreground/20"
              >
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
              </Link>
            ))}
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

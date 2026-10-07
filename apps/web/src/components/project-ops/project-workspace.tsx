'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { AvailabilityBadge } from '@/components/catalog/availability-badge';
import { AskAiLink } from '@/components/ai/ask-ai-link';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';
import type {
  ConstructionPhase,
  ConstructionUpdateSummary,
  ProjectInventoryListResponse,
  ProjectWorkspaceResponse,
  PropertySummary,
} from '@property-studio/contracts';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Breadcrumbs,
} from '@property-studio/ui';

const MILESTONES: ConstructionPhase[] = [
  'NOT_STARTED',
  'FOUNDATION',
  'STRUCTURE',
  'BRICKWORK',
  'ELECTRICAL',
  'PLUMBING',
  'FINISHING',
  'INFRASTRUCTURE',
  'HANDOVER',
  'COMPLETED',
  'OTHER',
];

type Section =
  | 'overview'
  | 'inventory'
  | 'construction'
  | 'community'
  | 'media'
  | 'documents'
  | 'leads'
  | 'crm'
  | 'settings';

export type ProjectWorkspaceProps = {
  orgPublicId: string;
  workspace: ProjectWorkspaceResponse;
  inventory?: ProjectInventoryListResponse | null;
};

function formatPrice(minor: string | null, currency: string): string {
  if (!minor) return 'Not set';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(minor) / 100);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProjectWorkspace({ orgPublicId, workspace, inventory }: ProjectWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [section, setSection] = useState<Section>('overview');
  const [inventoryRows, setInventoryRows] = useState<PropertySummary[]>(
    inventory?.properties ?? [],
  );
  const [updates, setUpdates] = useState<ConstructionUpdateSummary[]>(
    workspace.latestConstructionUpdates,
  );
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [milestone, setMilestone] = useState<ConstructionPhase>('OTHER');
  const [percent, setPercent] = useState('');
  const [updateDate, setUpdateDate] = useState(todayIsoDate);
  const [description, setDescription] = useState('');

  const project = workspace.project;
  const inventoryTotal = workspace.inventoryByAvailability.reduce((sum, row) => sum + row.count, 0);

  function refresh() {
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    if (section !== 'inventory' || inventoryRows.length > 0 || inventoryTotal === 0) return;
    let cancelled = false;
    void createBrowserApiClient()
      .listProjectInventory(orgPublicId, project.publicId, { limit: 50 })
      .then((page) => {
        if (!cancelled) setInventoryRows(page.properties);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Unable to load inventory.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [section, inventoryRows.length, inventoryTotal, orgPublicId, project.publicId]);

  useEffect(() => {
    if (section !== 'construction') return;
    let cancelled = false;
    void createBrowserApiClient()
      .listConstructionUpdates(project.publicId, { limit: 50 })
      .then((page) => {
        if (!cancelled) setUpdates(page.updates);
      })
      .catch(() => {
        /* keep workspace snapshot */
      });
    return () => {
      cancelled = true;
    };
  }, [section, project.publicId]);

  async function onCreateUpdate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const percentComplete =
      percent.trim() === '' ? null : Number.parseInt(percent, 10);
    if (percentComplete !== null && (Number.isNaN(percentComplete) || percentComplete < 0 || percentComplete > 100)) {
      setError('Percent complete must be between 0 and 100.');
      return;
    }
    try {
      const created = await createBrowserApiClient().createConstructionUpdate(project.publicId, {
        title: title.trim(),
        milestone,
        percentComplete,
        updateDate,
        description: description.trim() || null,
        mediaPublicIds: [],
      });
      setUpdates((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setPercent('');
      setMilestone('OTHER');
      setUpdateDate(todayIsoDate());
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create construction update.');
    }
  }

  async function onPublish(publicId: string) {
    setError(null);
    try {
      const published = await createBrowserApiClient().publishConstructionUpdate(publicId);
      setUpdates((prev) => prev.map((row) => (row.publicId === publicId ? published : row)));
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to publish update.');
    }
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
        description="Developer project workspace — inventory, construction, community, and operations."
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{project.publicId}</Badge>
        <Badge variant="outline">{project.lifecycleStatus}</Badge>
        <Badge variant="outline">{project.projectType.replaceAll('_', ' ')}</Badge>
        <Badge variant="outline">{project.constructionPhase.replaceAll('_', ' ')}</Badge>
        <Badge variant="outline">{project.trustStatus}</Badge>
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as Section)}
      >
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="construction">Construction</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">
                {[project.locality, project.city].filter(Boolean).join(', ') || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Starting price</dt>
              <dd className="font-medium">
                {formatPrice(project.startingPriceMinor, project.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Units</dt>
              <dd className="font-medium">{project.totalUnits ?? 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Construction</dt>
              <dd className="font-medium">
                {project.constructionPhase.replaceAll('_', ' ')}
                {project.constructionPercent !== null
                  ? ` · ${project.constructionPercent}%`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inventory</dt>
              <dd className="font-medium">{inventoryTotal} units</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Published</dt>
              <dd className="font-medium">{project.publishedAt ?? 'Not published'}</dd>
            </div>
          </dl>
          {inventoryTotal === 0 ? (
            <EmptyState
              title="No inventory yet"
              description="Link properties to this project to track availability."
            />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {workspace.inventoryByAvailability.map((row) => (
                <li key={row.availabilityStatus} className="flex items-center gap-2 text-sm">
                  <AvailabilityBadge status={row.availabilityStatus} />
                  <span className="text-muted-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 pt-4">
          {inventoryTotal === 0 ? (
            <EmptyState
              title="No inventory"
              description="Properties linked to this project appear here with live availability."
            />
          ) : inventoryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading inventory…</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {inventoryRows.map((property) => (
                <li
                  key={property.publicId}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <Link
                      href={`/app/org/${orgPublicId}/properties/${property.publicId}`}
                      className="font-medium hover:underline"
                    >
                      {property.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {[property.configuration, property.locality, property.city]
                        .filter(Boolean)
                        .join(' · ') || property.publicId}
                    </p>
                  </div>
                  <AvailabilityBadge status={property.availabilityStatus} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="construction" className="space-y-6 pt-4">
          <form onSubmit={onCreateUpdate} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="cu-title">Update title</Label>
              <Input
                id="cu-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={2}
                maxLength={200}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Milestone</Label>
              <Select
                value={milestone}
                onValueChange={(value) => setMilestone(value as ConstructionPhase)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-percent">Percent complete</Label>
              <Input
                id="cu-percent"
                type="number"
                min={0}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-date">Update date</Label>
              <Input
                id="cu-date"
                type="date"
                value={updateDate}
                onChange={(e) => setUpdateDate(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="cu-description">Description</Label>
              <textarea
                id="cu-description"
                className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                Create construction update
              </Button>
            </div>
          </form>

          {updates.length === 0 ? (
            <EmptyState
              title="No construction updates"
              description="Publish progress milestones for buyers and partners."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {updates.map((update) => (
                <li
                  key={update.publicId}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{update.title}</p>
                      <Badge variant="outline">{update.publicationStatus}</Badge>
                      <Badge variant="secondary">{update.milestone.replaceAll('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {update.updateDate}
                      {update.percentComplete !== null ? ` · ${update.percentComplete}%` : ''}
                    </p>
                    {update.description ? (
                      <p className="max-w-2xl text-sm text-muted-foreground">{update.description}</p>
                    ) : null}
                  </div>
                  {update.publicationStatus === 'DRAFT' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void onPublish(update.publicId)}
                    >
                      Publish
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="community" className="space-y-4 pt-4">
          {workspace.communities.length === 0 ? (
            <EmptyState
              title="No communities"
              description="Communities linked to this project appear here."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {workspace.communities.map((community) => (
                <li key={community.publicId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{community.name}</p>
                    <p className="text-sm text-muted-foreground">{community.publicId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{community.visibility}</Badge>
                    <Badge variant="secondary">{community.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/org/${orgPublicId}/community`}>Open community</Link>
          </Button>
        </TabsContent>

        <TabsContent value="media" className="space-y-4 pt-4">
          {workspace.mediaCount === 0 ? (
            <EmptyState
              title="No media"
              description="Media assets linked to this project appear when uploaded."
            />
          ) : (
            <p className="text-sm">
              <span className="font-medium">{workspace.mediaCount}</span> media asset
              {workspace.mediaCount === 1 ? '' : 's'} linked.
            </p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/org/${orgPublicId}/media`}>Manage media</Link>
          </Button>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 pt-4">
          {workspace.documentCount === 0 ? (
            <EmptyState
              title="No documents"
              description="Brochures and approvals appear when document metadata is linked."
            />
          ) : (
            <p className="text-sm">
              <span className="font-medium">{workspace.documentCount}</span> document
              {workspace.documentCount === 1 ? '' : 's'} linked.
            </p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/org/${orgPublicId}/documents`}>Manage documents</Link>
          </Button>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4 pt-4">
          {workspace.leadCount === 0 ? (
            <EmptyState
              title="No leads"
              description="Matched lead counts for this project appear when demand engages."
            />
          ) : (
            <p className="text-sm">
              <span className="font-medium">{workspace.leadCount}</span> lead
              {workspace.leadCount === 1 ? '' : 's'} matched to this project (counts only — no PII).
            </p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/org/${orgPublicId}/leads`}>Open leads</Link>
          </Button>
        </TabsContent>

        <TabsContent value="crm" className="space-y-4 pt-4">
          {workspace.openDealCount === 0 && workspace.openSiteVisitCount === 0 ? (
            <EmptyState
              title="No open CRM activity"
              description="Open deals and site visits for this project appear here."
            />
          ) : (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Open deals</dt>
                <dd className="font-medium">{workspace.openDealCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Open site visits</dt>
                <dd className="font-medium">{workspace.openSiteVisitCount}</dd>
              </div>
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/org/${orgPublicId}/crm/deals`}>Deals</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/org/${orgPublicId}/crm/site-visits`}>Site visits</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 pt-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Lifecycle</dt>
              <dd className="font-medium">{project.lifecycleStatus}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Construction phase</dt>
              <dd className="font-medium">{project.constructionPhase.replaceAll('_', ' ')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Construction percent</dt>
              <dd className="font-medium">
                {project.constructionPercent !== null ? `${project.constructionPercent}%` : 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trust status</dt>
              <dd className="font-medium">{project.trustStatus}</dd>
            </div>
            {workspace.claim ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Claim status</dt>
                <dd className="font-medium">
                  {workspace.claim.status} · {workspace.claim.publicId}
                </dd>
              </div>
            ) : null}
          </dl>
        </TabsContent>
      </Tabs>
    </div>
  );
}

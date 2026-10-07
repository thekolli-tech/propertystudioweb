'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';
import type { ProjectSummary } from '@property-studio/contracts';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@property-studio/ui';
import Link from 'next/link';

const PROJECT_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'PLOTTED', 'OTHER'] as const;

type Props = {
  organizationPublicId: string;
  initialProjects: ProjectSummary[];
};

export function ProjectCatalogManager({ organizationPublicId, initialProjects }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState<(typeof PROJECT_TYPES)[number]>('RESIDENTIAL');
  const [city, setCity] = useState('');

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createBrowserApiClient().createProject({
        organizationPublicId,
        name,
        projectType,
        city: city || null,
        countryCode: 'IN',
        currency: 'INR',
      });
      setName('');
      setCity('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create project.');
    }
  }

  async function setLifecycle(
    publicId: string,
    lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ) {
    setError(null);
    try {
      await createBrowserApiClient().updateProject(publicId, { lifecycleStatus });
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update project.');
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onCreate} className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="project-name">Project name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            placeholder="Skyline Residences"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={projectType}
            onValueChange={(v) => setProjectType(v as typeof projectType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-city">City</Label>
          <Input id="project-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            Create project
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {initialProjects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to start building your developer catalog."
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {initialProjects.map((project) => (
            <li
              key={project.publicId}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/org/${organizationPublicId}/projects/${project.publicId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {project.name}
                  </Link>
                  <Badge variant="secondary">{project.publicId}</Badge>
                  <Badge variant="outline">{project.lifecycleStatus}</Badge>
                  {project.constructionPhase ? (
                    <Badge variant="outline">
                      {project.constructionPhase.replaceAll('_', ' ')}
                    </Badge>
                  ) : null}
                  {project.trustStatus ? (
                    <Badge variant="outline">{project.trustStatus}</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {[project.city, project.locality].filter(Boolean).join(' · ') ||
                    'Location not set'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.lifecycleStatus !== 'PUBLISHED' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void setLifecycle(project.publicId, 'PUBLISHED')}
                  >
                    Publish
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void setLifecycle(project.publicId, 'DRAFT')}
                  >
                    Unpublish
                  </Button>
                )}
                {project.lifecycleStatus !== 'ARCHIVED' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => void setLifecycle(project.publicId, 'ARCHIVED')}
                  >
                    Archive
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

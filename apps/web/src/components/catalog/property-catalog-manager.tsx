'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';
import type { PropertySummary } from '@property-studio/contracts';
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

const PROPERTY_TYPES = [
  'APARTMENT',
  'VILLA',
  'PLOT',
  'OFFICE',
  'SHOP',
  'WAREHOUSE',
  'OTHER',
] as const;

const AVAILABILITY = ['AVAILABLE', 'UNDER_OFFER', 'SOLD', 'UNAVAILABLE'] as const;

type Props = {
  organizationPublicId: string;
  projectOptions: Array<{ publicId: string; name: string }>;
  initialProperties: PropertySummary[];
};

function formatInr(minor: string): string {
  const value = Number(minor) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PropertyCatalogManager({
  organizationPublicId,
  projectOptions,
  initialProperties,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]>('APARTMENT');
  const [priceMajor, setPriceMajor] = useState('');
  const [projectPublicId, setProjectPublicId] = useState<string>('none');
  const [city, setCity] = useState('');

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const rupees = Number(priceMajor);
    if (!Number.isFinite(rupees) || rupees < 0) {
      setError('Enter a valid price in INR.');
      return;
    }
    try {
      await createBrowserApiClient().createProperty({
        organizationPublicId,
        title,
        propertyType,
        listingType: 'SALE',
        priceMinor: BigInt(Math.round(rupees * 100)),
        currency: 'INR',
        countryCode: 'IN',
        city: city || null,
        projectPublicId: projectPublicId === 'none' ? null : projectPublicId,
        availabilityStatus: 'AVAILABLE',
      });
      setTitle('');
      setPriceMajor('');
      setCity('');
      setProjectPublicId('none');
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create property.');
    }
  }

  async function publish(publicId: string, publicationStatus: 'DRAFT' | 'PUBLISHED') {
    setError(null);
    try {
      await createBrowserApiClient().updateProperty(publicId, { publicationStatus });
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update publication.');
    }
  }

  async function setAvailability(
    publicId: string,
    availabilityStatus: (typeof AVAILABILITY)[number],
  ) {
    setError(null);
    try {
      await createBrowserApiClient().updateProperty(publicId, { availabilityStatus });
      refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update availability.');
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onCreate} className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="property-title">Title</Label>
          <Input
            id="property-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            placeholder="3BHK corner unit"
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={propertyType}
            onValueChange={(v) => setPropertyType(v as typeof propertyType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="property-price">Price (INR)</Label>
          <Input
            id="property-price"
            inputMode="numeric"
            value={priceMajor}
            onChange={(e) => setPriceMajor(e.target.value)}
            required
            placeholder="12500000"
          />
        </div>
        <div className="space-y-2">
          <Label>Project</Label>
          <Select value={projectPublicId} onValueChange={setProjectPublicId}>
            <SelectTrigger>
              <SelectValue placeholder="Optional project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projectOptions.map((project) => (
                <SelectItem key={project.publicId} value={project.publicId}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="property-city">City</Label>
          <Input id="property-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            Create property
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {initialProperties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Create a property listing and publish it when ready."
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {initialProperties.map((property) => (
            <li
              key={property.publicId}
              className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/org/${organizationPublicId}/properties/${property.publicId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {property.title}
                  </Link>
                  <Badge variant="secondary">{property.publicId}</Badge>
                  <Badge variant="outline">{property.publicationStatus}</Badge>
                  <Badge variant="outline">{property.availabilityStatus}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatInr(property.priceMinor)}
                  {property.city ? ` · ${property.city}` : ''}
                  {property.projectPublicId ? ` · ${property.projectPublicId}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {property.publicationStatus !== 'PUBLISHED' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void publish(property.publicId, 'PUBLISHED')}
                  >
                    Publish
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void publish(property.publicId, 'DRAFT')}
                  >
                    Unpublish
                  </Button>
                )}
                <Select
                  value={property.availabilityStatus}
                  onValueChange={(value) =>
                    void setAvailability(property.publicId, value as (typeof AVAILABILITY)[number])
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replaceAll('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

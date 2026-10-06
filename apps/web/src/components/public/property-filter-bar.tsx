'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  Button,
  FilterBar,
  FilterField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@property-studio/ui';

const PROPERTY_TYPES = [
  'APARTMENT',
  'VILLA',
  'PLOT',
  'OFFICE',
  'SHOP',
  'WAREHOUSE',
  'OTHER',
] as const;

const CONFIGS = [
  'STUDIO',
  'ONE_BHK',
  'TWO_BHK',
  'THREE_BHK',
  'FOUR_BHK',
  'FIVE_BHK_PLUS',
  'OTHER',
] as const;

const AVAILABILITY = ['AVAILABLE', 'UNDER_OFFER', 'SOLD', 'UNAVAILABLE'] as const;

export function PropertyFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [locality, setLocality] = useState(searchParams.get('locality') ?? '');
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') ?? 'any');
  const [configuration, setConfiguration] = useState(searchParams.get('configuration') ?? 'any');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') ?? '');
  const [availability, setAvailability] = useState(searchParams.get('availabilityStatus') ?? 'any');
  const [maxPrice, setMaxPrice] = useState(() => {
    const raw = searchParams.get('maxPriceMinor');
    if (!raw) return '';
    const minor = Number(raw);
    return Number.isFinite(minor) ? String(Math.round(minor / 100)) : '';
  });

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    if (locality.trim()) params.set('locality', locality.trim());
    if (propertyType !== 'any') params.set('propertyType', propertyType);
    if (configuration !== 'any') params.set('configuration', configuration);
    if (bedrooms.trim()) params.set('bedrooms', bedrooms.trim());
    if (availability !== 'any') params.set('availabilityStatus', availability);
    if (maxPrice.trim()) {
      const major = Number(maxPrice.trim());
      if (Number.isFinite(major) && major > 0) {
        params.set('maxPriceMinor', String(Math.round(major * 100)));
      }
    }
    startTransition(() => {
      router.push(`/properties${params.size ? `?${params.toString()}` : ''}`);
    });
  }

  return (
    <form onSubmit={applyFilters}>
      <FilterBar
        actions={
          <Button type="submit" disabled={pending}>
            Search
          </Button>
        }
      >
        <FilterField label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hyderabad" />
        </FilterField>
        <FilterField label="Locality">
          <Input
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="Jubilee Hills"
          />
        </FilterField>
        <FilterField label="Type">
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Configuration">
          <Select value={configuration} onValueChange={setConfiguration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {CONFIGS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Bedrooms">
          <Input
            inputMode="numeric"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            placeholder="4"
          />
        </FilterField>
        <FilterField label="Max budget (INR)">
          <Input
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="e.g. 10000000"
          />
        </FilterField>
        <FilterField label="Availability">
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {AVAILABILITY.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>
    </form>
  );
}

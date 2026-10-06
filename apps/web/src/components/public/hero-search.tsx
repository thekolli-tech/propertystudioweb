'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
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

const BUDGETS = [
  { value: '500000000', label: 'Under ₹50L' },
  { value: '1000000000', label: 'Under ₹1Cr' },
  { value: '2500000000', label: 'Under ₹2.5Cr' },
  { value: '5000000000', label: 'Under ₹5Cr' },
] as const;

export function HeroSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<'properties' | 'projects'>('properties');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState<string>('any');
  const [budget, setBudget] = useState<string>('any');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) {
      params.set('city', location.trim());
    }
    if (mode === 'properties') {
      if (propertyType !== 'any') params.set('propertyType', propertyType);
      if (budget !== 'any') params.set('maxPriceMinor', budget);
      router.push(`/properties${params.size ? `?${params.toString()}` : ''}`);
      return;
    }
    router.push(`/projects${params.size ? `?${params.toString()}` : ''}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="ps-card-elevated w-full max-w-4xl rounded-[var(--radius)] border border-border bg-card p-3 shadow-[var(--shadow-elevated)] sm:p-4"
    >
      <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
        <TabsList className="mb-3 h-9 w-full max-w-[220px] grid grid-cols-2">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
        <Input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="City, locality, or project"
          aria-label="Search location"
          className="h-11"
        />
        {mode === 'properties' ? (
          <>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger aria-label="Property type" className="h-11">
                <SelectValue placeholder="Property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger aria-label="Budget" className="h-11">
                <SelectValue placeholder="Budget" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any budget</SelectItem>
                {BUDGETS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            <Input
              disabled
              placeholder="Filters apply on results"
              aria-label="Project filters"
              className="h-11"
            />
            <Input
              disabled
              placeholder="Use project listing filters"
              aria-label="More filters"
              className="h-11"
            />
          </>
        )}
        <Button type="submit" size="lg" className="h-11 min-w-[7.5rem] w-full px-5 md:w-auto">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span>Search</span>
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Live catalog only.{' '}
        <Link
          href="/properties"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Browse properties
        </Link>
        {' · '}
        <Link
          href="/projects"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Browse projects
        </Link>
      </p>
    </form>
  );
}

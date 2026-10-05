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
      params.set(mode === 'properties' ? 'city' : 'city', location.trim());
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
      className="ps-card-elevated mx-auto w-full max-w-4xl rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-elevated)] sm:p-4"
    >
      <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
        <TabsList className="mb-3 grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <Input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="City, locality, or project"
          aria-label="Search location"
        />
        {mode === 'properties' ? (
          <>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger aria-label="Property type">
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
              <SelectTrigger aria-label="Budget">
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
            <Input disabled placeholder="Filters apply on results" aria-label="Project filters" />
            <Input disabled placeholder="Use project listing filters" aria-label="More filters" />
          </>
        )}
        <Button type="submit" size="lg" className="w-full md:w-auto">
          <Search className="h-4 w-4" aria-hidden />
          Search
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Results come from live catalog APIs. Empty catalogs show empty states — never fabricated listings.
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <Link href="/properties" className="text-muted-foreground underline-offset-2 hover:underline">
          Browse all properties
        </Link>
        <span className="text-border">·</span>
        <Link href="/projects" className="text-muted-foreground underline-offset-2 hover:underline">
          Browse all projects
        </Link>
      </div>
    </form>
  );
}

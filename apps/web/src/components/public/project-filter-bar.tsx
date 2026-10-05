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

const PROJECT_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'PLOTTED', 'OTHER'] as const;

export function ProjectFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [state, setState] = useState(searchParams.get('state') ?? '');
  const [locality, setLocality] = useState(searchParams.get('locality') ?? '');
  const [microMarket, setMicroMarket] = useState(searchParams.get('microMarket') ?? '');
  const [projectType, setProjectType] = useState(searchParams.get('projectType') ?? 'any');

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    if (state.trim()) params.set('state', state.trim());
    if (locality.trim()) params.set('locality', locality.trim());
    if (microMarket.trim()) params.set('microMarket', microMarket.trim());
    if (projectType !== 'any') params.set('projectType', projectType);
    startTransition(() => {
      router.push(`/projects${params.size ? `?${params.toString()}` : ''}`);
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
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </FilterField>
        <FilterField label="State">
          <Input value={state} onChange={(e) => setState(e.target.value)} />
        </FilterField>
        <FilterField label="Locality">
          <Input value={locality} onChange={(e) => setLocality(e.target.value)} />
        </FilterField>
        <FilterField label="Micro-market">
          <Input value={microMarket} onChange={(e) => setMicroMarket(e.target.value)} />
        </FilterField>
        <FilterField label="Type">
          <Select value={projectType} onValueChange={setProjectType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {PROJECT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>
    </form>
  );
}

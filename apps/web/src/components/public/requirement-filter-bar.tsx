'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  Button,
  FilterBar,
  FilterField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@property-studio/ui';

export function PublicRequirementFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') ?? '');
  const [transactionType, setTransactionType] = useState(searchParams.get('transactionType') ?? '');
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [configuration, setConfiguration] = useState(searchParams.get('configuration') ?? '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') ?? '');
  const [timeline, setTimeline] = useState(searchParams.get('timeline') ?? '');

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (propertyType) params.set('propertyType', propertyType);
    if (transactionType) params.set('transactionType', transactionType);
    if (city.trim()) params.set('city', city.trim());
    if (configuration) params.set('configuration', configuration);
    if (bedrooms) params.set('bedrooms', bedrooms);
    if (timeline) params.set('timeline', timeline);
    router.push(`/requirements${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <form onSubmit={submit}>
      <FilterBar
        actions={
          <Button type="submit" size="sm">
            Apply filters
          </Button>
        }
      >
        <FilterField label="Property type">
          <Select value={propertyType || undefined} onValueChange={setPropertyType}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APARTMENT">Apartment</SelectItem>
              <SelectItem value="VILLA">Villa</SelectItem>
              <SelectItem value="PLOT">Plot</SelectItem>
              <SelectItem value="OFFICE">Office</SelectItem>
              <SelectItem value="SHOP">Shop</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Buy / Rent">
          <Select value={transactionType || undefined} onValueChange={setTransactionType}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="RENT">Rent</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="City">
          <Input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="City"
          />
        </FilterField>
        <FilterField label="Configuration">
          <Select value={configuration || undefined} onValueChange={setConfiguration}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TWO_BHK">2 BHK</SelectItem>
              <SelectItem value="THREE_BHK">3 BHK</SelectItem>
              <SelectItem value="FOUR_BHK">4 BHK</SelectItem>
              <SelectItem value="FIVE_BHK_PLUS">5 BHK+</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Bedrooms">
          <Input
            value={bedrooms}
            onChange={(event) => setBedrooms(event.target.value)}
            placeholder="e.g. 4"
            inputMode="numeric"
          />
        </FilterField>
        <FilterField label="Timeline">
          <Select value={timeline || undefined} onValueChange={setTimeline}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IMMEDIATE">Immediate</SelectItem>
              <SelectItem value="WITHIN_3_MONTHS">Within 3 months</SelectItem>
              <SelectItem value="WITHIN_6_MONTHS">Within 6 months</SelectItem>
              <SelectItem value="WITHIN_1_YEAR">Within 1 year</SelectItem>
              <SelectItem value="FLEXIBLE">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>
      {/* Label import kept for density consistency with other filter bars */}
      <span className="sr-only">
        <Label>Filters</Label>
      </span>
    </form>
  );
}

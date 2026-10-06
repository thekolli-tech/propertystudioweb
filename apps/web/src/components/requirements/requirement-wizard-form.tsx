'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import {
  Button,
  ErrorState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: Array<{ id: Step; title: string }> = [
  { id: 1, title: 'Property' },
  { id: 2, title: 'Location' },
  { id: 3, title: 'Preferences' },
  { id: 4, title: 'Timeline' },
  { id: 5, title: 'Review' },
];

function croreToMinor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const major = Number(trimmed);
  if (!Number.isFinite(major) || major < 0) return null;
  // 1 crore INR = 10_000_000 rupees = 1_000_000_000 paise (minor units)
  return String(BigInt(Math.round(major * 1_000_000_000)));
}

export function RequirementWizardForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [propertyType, setPropertyType] = useState('APARTMENT');
  const [transactionType, setTransactionType] = useState('BUY');
  const [configuration, setConfiguration] = useState('THREE_BHK');
  const [bedrooms, setBedrooms] = useState('3');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [microMarket, setMicroMarket] = useState('');
  const [budgetMinCr, setBudgetMinCr] = useState('');
  const [budgetMaxCr, setBudgetMaxCr] = useState('');
  const [vaastuRequired, setVaastuRequired] = useState(false);
  const [amenities, setAmenities] = useState('');
  const [preferredProject, setPreferredProject] = useState('');
  const [purpose, setPurpose] = useState('END_USE');
  const [timeline, setTimeline] = useState('FLEXIBLE');
  const [notes, setNotes] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const amenityList = useMemo(
    () =>
      amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [amenities],
  );

  function goNext() {
    setError(null);
    if (step === 1 && !propertyType) {
      setError('Choose a property type.');
      return;
    }
    if (step === 2 && city.trim().length < 2) {
      setError('City is required.');
      return;
    }
    setStep((current) => Math.min(5, current + 1) as Step);
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(1, current - 1) as Step);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      const created = await client.createRequirement({
        propertyType: propertyType as 'APARTMENT',
        transactionType: transactionType as 'BUY' | 'RENT',
        configuration: configuration as 'THREE_BHK',
        bedrooms: bedrooms ? Number(bedrooms) : null,
        budgetMinMinor: croreToMinor(budgetMinCr) as unknown as bigint | null,
        budgetMaxMinor: croreToMinor(budgetMaxCr) as unknown as bigint | null,
        currency: 'INR',
        city: city.trim(),
        locality: locality.trim() || null,
        microMarket: microMarket.trim() || null,
        preferredProject: preferredProject.trim() || null,
        purpose: purpose as 'END_USE',
        timeline: timeline as 'FLEXIBLE',
        vaastuRequired,
        amenities: amenityList,
        notes: notes.trim() || null,
        visibility: 'PRIVATE',
      });

      if (publishNow) {
        await client.publishRequirement(created.publicId);
      }

      router.push(`/app/requirements/${created.publicId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create requirement.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((item) => (
          <li
            key={item.id}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              item.id === step
                ? 'bg-primary text-primary-foreground'
                : item.id < step
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {item.id}. {item.title}
          </li>
        ))}
      </ol>

      {error ? <ErrorState title="Could not continue" message={error} /> : null}

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Property type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APARTMENT">Apartment</SelectItem>
                <SelectItem value="VILLA">Villa</SelectItem>
                <SelectItem value="PLOT">Plot</SelectItem>
                <SelectItem value="OFFICE">Office</SelectItem>
                <SelectItem value="SHOP">Shop</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transaction</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="RENT">Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Configuration</Label>
            <Select value={configuration} onValueChange={setConfiguration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDIO">Studio</SelectItem>
                <SelectItem value="ONE_BHK">1 BHK</SelectItem>
                <SelectItem value="TWO_BHK">2 BHK</SelectItem>
                <SelectItem value="THREE_BHK">3 BHK</SelectItem>
                <SelectItem value="FOUR_BHK">4 BHK</SelectItem>
                <SelectItem value="FIVE_BHK_PLUS">5 BHK+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bedrooms</Label>
            <Input
              value={bedrooms}
              onChange={(event) => setBedrooms(event.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={city} onChange={(event) => setCity(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Locality</Label>
            <Input value={locality} onChange={(event) => setLocality(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Micro-market</Label>
            <Input value={microMarket} onChange={(event) => setMicroMarket(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Budget min (₹ crore)</Label>
            <Input
              value={budgetMinCr}
              onChange={(event) => setBudgetMinCr(event.target.value)}
              placeholder="e.g. 6"
            />
          </div>
          <div className="space-y-2">
            <Label>Budget max (₹ crore)</Label>
            <Input
              value={budgetMaxCr}
              onChange={(event) => setBudgetMaxCr(event.target.value)}
              placeholder="e.g. 8"
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Preferred amenities (comma separated)</Label>
            <Input
              value={amenities}
              onChange={(event) => setAmenities(event.target.value)}
              placeholder="Gated Community, Pool"
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred project</Label>
            <Input
              value={preferredProject}
              onChange={(event) => setPreferredProject(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vaastuRequired}
              onChange={(event) => setVaastuRequired(event.target.checked)}
            />
            Vaastu preferred
          </label>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="END_USE">End use</SelectItem>
                <SelectItem value="INVESTMENT">Investment</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timeline</Label>
            <Select value={timeline} onValueChange={setTimeline}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                <SelectItem value="WITHIN_3_MONTHS">Within 3 months</SelectItem>
                <SelectItem value="WITHIN_6_MONTHS">Within 6 months</SelectItem>
                <SelectItem value="WITHIN_1_YEAR">Within 1 year</SelectItem>
                <SelectItem value="FLEXIBLE">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Private notes (never shown on marketplace)</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {transactionType} · {configuration.replace(/_/g, ' ')} · {propertyType} in {city || '—'}
          </p>
          <p className="text-sm">
            Budget: {budgetMinCr || '—'} – {budgetMaxCr || '—'} Cr · Timeline: {timeline}
          </p>
          <p className="text-sm">Purpose: {purpose}</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(event) => setPublishNow(event.target.checked)}
            />
            Publish to marketplace (anonymized)
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={goBack}>
            Back
          </Button>
        ) : (
          <Button asChild type="button" variant="outline">
            <Link href="/app/requirements">Cancel</Link>
          </Button>
        )}
        {step < 5 ? (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : publishNow ? 'Publish requirement' : 'Save draft'}
          </Button>
        )}
      </div>
    </form>
  );
}

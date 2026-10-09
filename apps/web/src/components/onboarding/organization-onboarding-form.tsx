'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import type { OrganizationType } from '@property-studio/permissions';
import { Button, ErrorState, Input, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: Array<{ id: Step; title: string }> = [
  { id: 1, title: 'Type' },
  { id: 2, title: 'Company' },
  { id: 3, title: 'Presence' },
  { id: 4, title: 'Review' },
  { id: 5, title: 'Workspace' },
];

export function OrganizationOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<OrganizationType | null>(null);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [headquartersCity, setHeadquartersCity] = useState('');
  const [headquartersState, setHeadquartersState] = useState('');
  const [operatingZones, setOperatingZones] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createdOrgPublicId, setCreatedOrgPublicId] = useState<string | null>(null);

  const zones = useMemo(
    () =>
      operatingZones
        .split(',')
        .map((zone) => zone.trim())
        .filter(Boolean),
    [operatingZones],
  );

  function goNext() {
    setError(null);
    if (step === 1 && !type) {
      setError('Choose an organization type to continue.');
      return;
    }
    if (step === 2) {
      if (name.trim().length < 2 || legalName.trim().length < 2 || displayName.trim().length < 2) {
        setError('Organization name, legal name, and display name are required.');
        return;
      }
    }
    setStep((current) => Math.min(5, current + 1) as Step);
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(1, current - 1) as Step);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!type) return;
    setPending(true);
    setError(null);
    try {
      const profileBase = {
        legalName: legalName.trim(),
        displayName: displayName.trim(),
        description: description.trim() || null,
        website: website.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        headquartersCity: headquartersCity.trim() || null,
        headquartersState: headquartersState.trim() || null,
        operatingZones: zones,
      };

      const result = await createBrowserApiClient().onboardOrganization(
        type === 'DEVELOPER'
          ? {
              type: 'DEVELOPER',
              name: name.trim(),
              profile: profileBase,
            }
          : {
              type: 'AGENCY',
              name: name.trim(),
              profile: {
                ...profileBase,
                specialization: specialization.trim() || null,
                propertyTypes: [],
                configurations: [],
              },
            },
      );

      setCreatedOrgPublicId(result.organization.publicId);
      setStep(5);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to create organization. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ol className="mb-8 flex flex-wrap gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {STEPS.map((item) => (
          <li
            key={item.id}
            className={
              item.id === step
                ? 'rounded-md bg-accent px-2 py-1 text-accent-foreground'
                : item.id < step
                  ? 'rounded-md px-2 py-1 text-foreground'
                  : 'rounded-md px-2 py-1'
            }
          >
            {item.id}. {item.title}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Choose organization type</h2>
          <p className="text-sm text-muted-foreground">
            Create a professional Developer or Agency organization. Personal accounts do not need an
            organization.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-lg border px-4 py-5 text-left transition-colors ${
                type === 'DEVELOPER'
                  ? 'border-primary bg-accent'
                  : 'border-border hover:bg-muted/40'
              }`}
              onClick={() => setType('DEVELOPER')}
            >
              <p className="font-medium text-foreground">Developer / Builder</p>
              <p className="mt-1 text-sm text-muted-foreground">
                For development companies managing projects and inventory.
              </p>
            </button>
            <button
              type="button"
              className={`rounded-lg border px-4 py-5 text-left transition-colors ${
                type === 'AGENCY' ? 'border-primary bg-accent' : 'border-border hover:bg-muted/40'
              }`}
              onClick={() => setType('AGENCY')}
            >
              <p className="font-medium text-foreground">Agency / Agent</p>
              <p className="mt-1 text-sm text-muted-foreground">
                For brokerages and agents serving buyers and sellers.
              </p>
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Company information</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal / company name</Label>
            <Input
              id="legalName"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Public display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </div>
          {type === 'AGENCY' ? (
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                placeholder="e.g. Resale apartments, Plot advisory"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Operating zones & contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">Headquarters city</Label>
              <Input
                id="city"
                value={headquartersCity}
                onChange={(event) => setHeadquartersCity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Headquarters state</Label>
              <Input
                id="state"
                value={headquartersState}
                onChange={(event) => setHeadquartersState(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zones">Operating zones</Label>
            <Input
              id="zones"
              value={operatingZones}
              onChange={(event) => setOperatingZones(event.target.value)}
              placeholder="Comma-separated, e.g. Hyderabad, Bengaluru"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Contact email</Label>
              <Input
                id="email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Contact phone</Label>
              <Input
                id="phone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <form onSubmit={submit} className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Review</h2>
          <dl className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="font-medium">{name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Legal name</dt>
              <dd className="font-medium">{legalName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Display name</dt>
              <dd className="font-medium">{displayName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zones</dt>
              <dd className="font-medium">{zones.length ? zones.join(', ') : 'None listed'}</dd>
            </div>
            {type === 'AGENCY' ? (
              <div>
                <dt className="text-muted-foreground">Specialization</dt>
                <dd className="font-medium">{specialization || 'Not specified'}</dd>
              </div>
            ) : null}
          </dl>
          {error ? (
            <ErrorState title="Could not create organization" message={error} className="py-6" />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create organization'}
            </Button>
          </div>
        </form>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Welcome to your workspace</h2>
          <p className="text-sm text-muted-foreground">
            Your organization is ready. You are the initial owner. Continue to overview and team
            management.
          </p>
          <Button
            type="button"
            onClick={() => {
              if (createdOrgPublicId) {
                router.push(`/app/org/${createdOrgPublicId}`);
              } else {
                router.push('/app');
              }
            }}
          >
            Enter workspace
          </Button>
        </div>
      ) : null}

      {step < 4 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
          ) : null}
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        </div>
      ) : null}

      {error && step < 4 ? (
        <div className="mt-4">
          <ErrorState title="Check your details" message={error} className="py-6" />
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { Button, ErrorState, Input, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

type AgentKind = 'INDIVIDUAL' | 'AGENCY';
type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: Array<{ id: Step; title: string }> = [
  { id: 1, title: 'Kind' },
  { id: 2, title: 'Identity' },
  { id: 3, title: 'Practice' },
  { id: 4, title: 'Review' },
  { id: 5, title: 'Done' },
];

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AgentOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<AgentKind | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [operatingZones, setOperatingZones] = useState('');
  const [propertyTypes, setPropertyTypes] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createdOrgPublicId, setCreatedOrgPublicId] = useState<string | null>(null);

  const zones = useMemo(() => splitList(operatingZones), [operatingZones]);
  const types = useMemo(() => splitList(propertyTypes), [propertyTypes]);

  function goNext() {
    setError(null);
    if (step === 1 && !kind) {
      setError('Choose individual agent or agency organization.');
      return;
    }
    if (step === 2) {
      if (companyName.trim().length < 2 || displayName.trim().length < 2) {
        setError('Company/agency name and agent display name are required.');
        return;
      }
    }
    if (step === 3 && !declarationAccepted) {
      setError('Accept the accuracy declaration to continue.');
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
    if (!kind || !declarationAccepted) return;
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      const legalName = companyName.trim();
      const result = await client.onboardOrganization({
        type: 'AGENCY',
        name: companyName.trim(),
        profile: {
          legalName,
          displayName: displayName.trim(),
          specialization: specialization.trim() || null,
          reraNumber: reraNumber.trim() || null,
          operatingZones: zones,
          propertyTypes: types,
          configurations: [],
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
        },
      });

      const orgPublicId = result.organization.publicId;
      const subjectPublicId =
        result.agencyProfile?.publicId ?? result.organization.profilePublicId ?? null;

      if (subjectPublicId) {
        await client.createVerificationCase({
          organizationPublicId: orgPublicId,
          subjectType: 'AGENT',
          subjectPublicId,
          verificationType: 'AGENT',
          reraNumber: reraNumber.trim() || null,
          declarationAccepted: true,
        });
      }

      setCreatedOrgPublicId(orgPublicId);
      setStep(5);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to complete agent onboarding. Please try again.');
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
          <h2 className="font-display text-2xl font-semibold">How do you work?</h2>
          <p className="text-sm text-muted-foreground">
            Both paths create an Agency organization. Verification uses subject type Agent.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-lg border px-4 py-5 text-left transition-colors ${
                kind === 'INDIVIDUAL'
                  ? 'border-primary bg-accent'
                  : 'border-border hover:bg-muted/40'
              }`}
              onClick={() => setKind('INDIVIDUAL')}
            >
              <p className="font-medium text-foreground">Individual agent</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo broker or consultant. Use your practice name as the company name.
              </p>
            </button>
            <button
              type="button"
              className={`rounded-lg border px-4 py-5 text-left transition-colors ${
                kind === 'AGENCY' ? 'border-primary bg-accent' : 'border-border hover:bg-muted/40'
              }`}
              onClick={() => setKind('AGENCY')}
            >
              <p className="font-medium text-foreground">Agency organization</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Brokerage or team workspace with shared listings and CRM.
              </p>
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Identity</h2>
          <div className="space-y-2">
            <Label htmlFor="companyName">
              {kind === 'INDIVIDUAL' ? 'Practice / company name' : 'Agency name'}
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Agent / public display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reraNumber">RERA number</Label>
            <Input
              id="reraNumber"
              value={reraNumber}
              onChange={(event) => setReraNumber(event.target.value)}
              placeholder="e.g. A52100000000"
              maxLength={64}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Practice focus</h2>
          <div className="space-y-2">
            <Label htmlFor="zones">Operating zones</Label>
            <Input
              id="zones"
              value={operatingZones}
              onChange={(event) => setOperatingZones(event.target.value)}
              placeholder="Comma-separated, e.g. Hyderabad, Gachibowli"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyTypes">Property types</Label>
            <Input
              id="propertyTypes"
              value={propertyTypes}
              onChange={(event) => setPropertyTypes(event.target.value)}
              placeholder="Comma-separated, e.g. Apartment, Villa, Plot"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
              placeholder="e.g. Resale apartments, Plot advisory"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={declarationAccepted}
              onChange={(event) => setDeclarationAccepted(event.target.checked)}
            />
            <span>
              I declare that the information provided is accurate and I understand that Verified
              Expert status requires RERA verification and a processing fee.
            </span>
          </label>
        </div>
      ) : null}

      {step === 4 ? (
        <form onSubmit={submit} className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Review</h2>
          <dl className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Kind</dt>
              <dd className="font-medium">
                {kind === 'INDIVIDUAL' ? 'Individual agent' : 'Agency organization'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Company / agency</dt>
              <dd className="font-medium">{companyName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Display name</dt>
              <dd className="font-medium">{displayName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">RERA</dt>
              <dd className="font-medium">{reraNumber || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zones</dt>
              <dd className="font-medium">{zones.length ? zones.join(', ') : 'None listed'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Property types</dt>
              <dd className="font-medium">{types.length ? types.join(', ') : 'None listed'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Specialization</dt>
              <dd className="font-medium">{specialization || 'Not specified'}</dd>
            </div>
          </dl>
          {error ? (
            <ErrorState title="Could not complete onboarding" message={error} className="py-6" />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create agency & start verification'}
            </Button>
          </div>
        </form>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Workspace ready</h2>
          <p className="text-sm text-muted-foreground">
            Your Agency organization and Agent verification case are set up. Pay the processing fee
            and submit documents from Verification to unlock Verified Expert status.
          </p>
          <Button
            type="button"
            onClick={() => {
              if (createdOrgPublicId) {
                router.push(`/app/org/${createdOrgPublicId}`);
              } else {
                router.push('/app/agent');
              }
            }}
          >
            Enter agent workspace
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

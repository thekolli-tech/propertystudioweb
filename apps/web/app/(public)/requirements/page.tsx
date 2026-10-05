export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
  Button,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@property-studio/ui';

export const metadata = { title: 'Requirements' };

export default function RequirementsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Post a requirement"
        description="Share what you are looking for. Lead marketplace submission is not live yet — this form is a UI foundation only."
      />
      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-6 ps-card-elevated"
        aria-disabled
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Property type</Label>
            <Select disabled defaultValue="apartment">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Apartment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Configuration</Label>
            <Select disabled defaultValue="3bhk">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3bhk">3 BHK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input disabled placeholder="Available when requirements API ships" />
          </div>
          <div className="space-y-2">
            <Label>Budget (INR)</Label>
            <Input disabled placeholder="Available when requirements API ships" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes / Vaastu preferences</Label>
          <Input disabled placeholder="Notes field reserved for future API" />
        </div>
        <Button type="button" disabled>
          Submit requirement
        </Button>
        <p className="text-xs text-muted-foreground">
          No fabricated leads are stored. Browse live inventory meanwhile.
        </p>
        <Button asChild variant="outline">
          <Link href="/properties">Browse properties</Link>
        </Button>
      </form>
      <EmptyState
        title="Lead marketplace not active"
        description="Requirements matching, agent routing, and CRM handoff arrive in later phases."
      />
    </main>
  );
}

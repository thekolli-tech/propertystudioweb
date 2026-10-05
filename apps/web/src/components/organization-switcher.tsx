'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OrganizationSummary } from '@property-studio/contracts';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@property-studio/ui';
import { Building2, Check, ChevronDown } from 'lucide-react';

import { createBrowserApiClient } from '@/lib/api';

export type OrganizationSwitcherProps = {
  organizations: OrganizationSummary[];
  activeOrganizationPublicId: string | null;
};

export function OrganizationSwitcher({
  organizations,
  activeOrganizationPublicId,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const active = organizations.find((org) => org.publicId === activeOrganizationPublicId) ?? null;

  async function handleSwitch(publicId: string) {
    await createBrowserApiClient().switchOrganization(publicId);
    router.push(`/app/org/${publicId}`);
    router.refresh();
  }

  if (organizations.length === 0) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/app">No organizations</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[16rem] gap-2">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{active?.name ?? 'Select organization'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.publicId}
            className="flex items-center justify-between gap-2"
            onSelect={() => {
              void handleSwitch(org.publicId);
            }}
          >
            <span className="truncate">
              <span className="block font-medium">{org.name}</span>
              <span className="text-xs text-muted-foreground">{org.publicId}</span>
            </span>
            {org.publicId === activeOrganizationPublicId ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserSummary } from '@property-studio/contracts';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@property-studio/ui';
import { ChevronDown } from 'lucide-react';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export type UserMenuProps = {
  user: UserSummary;
};

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await createBrowserApiClient().logout();
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        throw error;
      }
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="max-w-[14rem] gap-2">
          <span className="truncate text-sm">{user.email}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.email}</span>
            <span className="text-xs text-muted-foreground">{user.publicId}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/me">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/saved">Saved</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/inbox">Inbox</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleLogout()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { OrganizationMembersResponse } from '@property-studio/contracts';
import {
  ORGANIZATION_TYPE_ROLES,
  type OrganizationRole,
  type OrganizationType,
} from '@property-studio/permissions';
import {
  Badge,
  Button,
  ErrorState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

type Member = OrganizationMembersResponse['members'][number];

export type TeamManagementProps = {
  orgPublicId: string;
  organizationType: OrganizationType;
  canManage: boolean;
  initialMembers: Member[];
  currentUserPublicId: string;
};

export function TeamManagement({
  orgPublicId,
  organizationType,
  canManage,
  initialMembers,
  currentUserPublicId,
}: TeamManagementProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [userPublicId, setUserPublicId] = useState('');
  const roles = ORGANIZATION_TYPE_ROLES[organizationType];
  const [role, setRole] = useState<OrganizationRole>(roles[roles.length - 1] ?? roles[0]!);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshMembers() {
    const result = await createBrowserApiClient().listOrganizationMembers(orgPublicId);
    setMembers(result.members);
    router.refresh();
  }

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createBrowserApiClient().inviteOrganizationMember(orgPublicId, {
        userPublicId: userPublicId.trim(),
        role,
      });
      setUserPublicId('');
      await refreshMembers();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to invite member.');
      }
    } finally {
      setPending(false);
    }
  }

  async function onDeactivate(memberId: string) {
    setPending(true);
    setError(null);
    try {
      await createBrowserApiClient().deactivateOrganizationMember(orgPublicId, memberId);
      await refreshMembers();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to deactivate member.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.userPublicId}>
                <TableCell>
                  <div className="font-medium">{member.email}</div>
                  <div className="text-xs text-muted-foreground">{member.userPublicId}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{member.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={member.status === 'ACTIVE' ? 'success' : 'outline'}>
                    {member.status}
                  </Badge>
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    {member.userPublicId !== currentUserPublicId && member.status === 'ACTIVE' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => void onDeactivate(member.userPublicId)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canManage ? (
        <form onSubmit={onInvite} className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h3 className="font-medium">Invite member</h3>
          <p className="text-sm text-muted-foreground">
            Invite an existing Property Studio user by public ID (`PS-USER-######`).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userPublicId">User public ID</Label>
              <Input
                id="userPublicId"
                value={userPublicId}
                onChange={(event) => setUserPublicId(event.target.value)}
                placeholder="PS-USER-000001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as OrganizationRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <ErrorState title="Invite failed" message={error} className="py-4" /> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Working…' : 'Invite member'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can view the team roster. Member management requires an owner role.
        </p>
      )}
    </div>
  );
}

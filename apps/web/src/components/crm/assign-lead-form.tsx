'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

type MemberOption = {
  userPublicId: string;
  email: string;
  status: string;
};

export function AssignLeadForm({
  organizationPublicId,
  leadPublicId,
  currentAssigneePublicId,
  expectedVersion,
  members,
}: {
  organizationPublicId: string;
  leadPublicId: string;
  currentAssigneePublicId: string | null;
  expectedVersion: number;
  members: MemberOption[];
}) {
  const router = useRouter();
  const activeMembers = members.filter((member) => member.status === 'ACTIVE');
  const [assignee, setAssignee] = useState(currentAssigneePublicId ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      await client.assignCrmLead(leadPublicId, {
        organizationPublicId,
        assigneeUserPublicId: assignee.trim() ? assignee.trim() : null,
        expectedVersion,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to assign lead.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[12rem] flex-1 space-y-1.5">
        <Label htmlFor="crm-lead-assignee">Assignee</Label>
        <select
          id="crm-lead-assignee"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
        >
          <option value="">Unassigned</option>
          {activeMembers.map((member) => (
            <option key={member.userPublicId} value={member.userPublicId}>
              {member.email}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Assign'}
      </Button>
      {error ? <ErrorState title="Assignment failed" message={error} /> : null}
    </form>
  );
}

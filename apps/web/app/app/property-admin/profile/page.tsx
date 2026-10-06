import { Badge, PageHeader } from '@property-studio/ui';

import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Profile' };

export default async function PropertyAdminProfilePage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your Property Admin account. Private identifiers stay server-side."
      />
      <section className="rounded-xl border border-border bg-card p-6 ps-card-elevated">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{user?.status ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Public user ID</dt>
            <dd className="font-medium">{user?.publicId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Roles</dt>
            <dd className="flex flex-wrap gap-2">
              {(user?.platformRoles ?? []).map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

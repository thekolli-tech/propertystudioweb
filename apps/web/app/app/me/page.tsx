import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Separator,
} from '@property-studio/ui';
import { redirect } from 'next/navigation';

import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Profile' };

export default async function AppMePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app/me');
  }

  return (
    <div>
      <PageHeader title="Profile" description="Identity from the NestJS /auth/me endpoint." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Public ID</p>
              <p className="font-medium">{user.publicId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{user.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email verified</p>
              <p className="font-medium">{user.emailVerified ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="mb-2 text-muted-foreground">Personas</p>
              <div className="flex flex-wrap gap-2">
                {user.personas.length === 0 ? (
                  <span className="text-muted-foreground">None assigned</span>
                ) : (
                  user.personas.map((persona) => (
                    <Badge key={persona} variant="secondary">
                      {persona}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-muted-foreground">Platform roles</p>
              <div className="flex flex-wrap gap-2">
                {user.platformRoles.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  user.platformRoles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Active organization</p>
              <p className="font-medium">{user.activeOrganizationPublicId ?? 'None'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

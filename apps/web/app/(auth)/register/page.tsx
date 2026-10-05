import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@property-studio/ui';

import { RegisterForm } from '@/components/auth/register-form';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Create account</CardTitle>
        <CardDescription>
          Register with email and a strong password. NestJS owns authentication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}

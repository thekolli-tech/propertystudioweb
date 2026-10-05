import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@property-studio/ui';

import { LoginForm } from '@/components/auth/login-form';

export const metadata = { title: 'Sign in' };

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith('/') ? params.next : '/app';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Sign in</CardTitle>
        <CardDescription>
          Use your Property Studio account. Sessions are issued by the API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm nextPath={nextPath} />
      </CardContent>
    </Card>
  );
}

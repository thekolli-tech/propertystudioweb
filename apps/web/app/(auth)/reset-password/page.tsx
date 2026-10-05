import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@property-studio/ui';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Reset password</CardTitle>
        <CardDescription>
          Token-based password reset UI will connect when email delivery is live.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Reset link handling deferred"
          description="Use Profile → change password when signed in, via POST /api/v1/auth/password/change."
          className="border-0 bg-transparent px-0 py-8"
          action={
            <Button asChild variant="outline">
              <Link href="/login">Back to sign in</Link>
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}

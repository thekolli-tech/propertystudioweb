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

export const metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Forgot password</CardTitle>
        <CardDescription>
          Password reset email delivery is not enabled in this phase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Reset via email coming soon"
          description="Signed-in users can change their password from Profile using the existing API."
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

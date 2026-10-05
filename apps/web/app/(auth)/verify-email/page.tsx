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

export const metadata = { title: 'Verify email' };

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Verify email</CardTitle>
        <CardDescription>
          Email verification flows will connect to the API in a later phase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Verification not configured yet"
          description="Check your inbox once verification messaging is enabled. You can continue using your account in the meantime."
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

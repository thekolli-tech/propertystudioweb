import { PageHeader } from '@property-studio/ui';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="About Property Studio"
        description="A property intelligence platform for the Indian real-estate market."
      />
      <div className="prose-none space-y-4 text-base leading-relaxed text-muted-foreground">
        <p>
          Property Studio brings together public discovery, professional organization workspaces,
          and community surfaces — with NestJS as the system of record and a session-secured
          application shell.
        </p>
        <p>
          This release establishes the premium public website, shared design system, Super Admin and
          Property Admin shells, and dynamic catalog discovery. Domains such as CRM, payments, and
          AI remain intentionally deferred.
        </p>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';

import { ProjectPresentation } from '@/components/studio/project-presentation';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Studio · Project presentation' };

export default async function StudioProjectDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const cookie = await getRequestCookieHeader();

  let presentation = null;
  let unavailable = false;
  let unavailableMessage =
    'Project presentation could not be loaded. Sign in with intelligence:read access, or verify the project exists.';

  try {
    presentation = await createServerApiClient(cookie).getStudioProjectPresentation(publicId);
  } catch (error) {
    unavailable = true;
    if (error instanceof Error && error.message) {
      unavailableMessage = error.message;
    }
  }

  return (
    <ProjectPresentation
      presentation={presentation}
      unavailable={unavailable}
      unavailableMessage={unavailableMessage}
    />
  );
}

export const dynamic = 'force-dynamic';

import { PropertyPresentation } from '@/components/studio/property-presentation';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Studio · Property presentation' };

export default async function StudioPropertyDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const cookie = await getRequestCookieHeader();

  let presentation = null;
  let unavailable = false;
  let unavailableMessage =
    'Property presentation could not be loaded. Sign in with intelligence:read access, or verify the listing exists.';

  try {
    presentation = await createServerApiClient(cookie).getStudioPropertyPresentation(publicId);
  } catch (error) {
    unavailable = true;
    if (error instanceof Error && error.message) {
      unavailableMessage = error.message;
    }
  }

  return (
    <PropertyPresentation
      presentation={presentation}
      unavailable={unavailable}
      unavailableMessage={unavailableMessage}
    />
  );
}

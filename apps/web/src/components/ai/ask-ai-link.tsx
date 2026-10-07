import Link from 'next/link';
import { Button } from '@property-studio/ui';
import type { AiConversationContextHints } from '@property-studio/contracts';

function buildHref(hints: AiConversationContextHints, basePath = '/app/ai/chat'): string {
  const params = new URLSearchParams();
  if (hints.propertyPublicId) params.set('propertyPublicId', hints.propertyPublicId);
  if (hints.projectPublicId) params.set('projectPublicId', hints.projectPublicId);
  if (hints.requirementPublicId) params.set('requirementPublicId', hints.requirementPublicId);
  if (hints.organizationPublicId) params.set('organizationPublicId', hints.organizationPublicId);
  if (hints.focus) params.set('focus', hints.focus);
  if (hints.route) params.set('route', hints.route);
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function AskAiLink({
  hints,
  label,
  basePath = '/app/ai/chat',
  className,
}: {
  hints: AiConversationContextHints;
  label: string;
  basePath?: string;
  className?: string;
}) {
  return (
    <Button asChild variant="outline" className={className}>
      <Link href={buildHref(hints, basePath)}>{label}</Link>
    </Button>
  );
}

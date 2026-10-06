import * as React from 'react';
import { MapPin } from 'lucide-react';

import { cn } from '../lib/utils';
import { Avatar } from './avatar';
import { Badge } from './ui/badge';
import { StatusBadge } from './status-badge';

export type AgentCardProps = {
  href: string;
  name: string;
  publicId: string;
  specialization?: string | null;
  location?: string | null;
  verificationStatus?: string | null;
  className?: string;
  linkComponent?: React.ElementType;
};

export function AgentCard({
  href,
  name,
  publicId,
  specialization,
  location,
  verificationStatus,
  className,
  linkComponent: LinkComponent = 'a',
}: AgentCardProps) {
  return (
    <LinkComponent
      href={href}
      className={cn(
        'ps-card-elevated flex gap-4 rounded-xl border border-border bg-card p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Avatar name={name} className="h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {publicId}
            </p>
            <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
          </div>
          {verificationStatus === 'VERIFIED' ? (
            <StatusBadge tone="success">Verified</StatusBadge>
          ) : verificationStatus ? (
            <Badge variant="outline">Verification required</Badge>
          ) : null}
        </div>
        {specialization ? <p className="text-sm text-muted-foreground">{specialization}</p> : null}
        {location ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        ) : null}
      </div>
    </LinkComponent>
  );
}

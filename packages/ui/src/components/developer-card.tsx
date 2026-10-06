import * as React from 'react';
import { Building2, MapPin } from 'lucide-react';

import { cn } from '../lib/utils';
import { Avatar } from './avatar';
import { Badge } from './ui/badge';

export type DeveloperCardProps = {
  href: string;
  name: string;
  publicId: string;
  location?: string | null;
  zones?: string[];
  description?: string | null;
  className?: string;
  linkComponent?: React.ElementType;
};

export function DeveloperCard({
  href,
  name,
  publicId,
  location,
  zones = [],
  description,
  className,
  linkComponent: LinkComponent = 'a',
}: DeveloperCardProps) {
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
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {publicId}
          </p>
          <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
        </div>
        {location ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        ) : null}
        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {zones.length ? (
          <div className="flex flex-wrap gap-1.5">
            {zones.slice(0, 3).map((zone) => (
              <Badge key={zone} variant="outline">
                {zone}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            Developer profile
          </p>
        )}
      </div>
    </LinkComponent>
  );
}

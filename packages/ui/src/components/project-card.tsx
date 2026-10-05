import * as React from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';

import { cn } from '../lib/utils';
import { ImagePlaceholder } from './image-placeholder';
import { PriceDisplay } from './price-display';
import { Badge } from './ui/badge';

export type ProjectCardProps = {
  href: string;
  name: string;
  publicId: string;
  location?: string | null;
  developerName?: string | null;
  projectType?: string | null;
  startingPriceMinor?: string | null;
  currency?: string;
  imageSlot?: React.ReactNode;
  variant?: 'grid' | 'row';
  className?: string;
  linkComponent?: React.ElementType;
};

export function ProjectCard({
  href,
  name,
  publicId,
  location,
  developerName,
  projectType,
  startingPriceMinor,
  currency = 'INR',
  imageSlot,
  variant = 'grid',
  className,
  linkComponent: LinkComponent = 'a',
}: ProjectCardProps) {
  if (variant === 'row') {
    return (
      <LinkComponent
        href={href}
        className={cn(
          'ps-card-elevated group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg">
          {imageSlot ?? <ImagePlaceholder className="h-full aspect-auto" ratio="square" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {publicId}
          </p>
          <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {[developerName, location].filter(Boolean).join(' · ') || 'Location not published'}
          </p>
        </div>
        <ArrowUpRight
          className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden
        />
      </LinkComponent>
    );
  }

  return (
    <LinkComponent
      href={href}
      className={cn(
        'ps-card-elevated group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="relative overflow-hidden">{imageSlot ?? <ImagePlaceholder />}</div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {publicId}
            </p>
            {projectType ? <Badge variant="secondary">{projectType.replaceAll('_', ' ')}</Badge> : null}
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {name}
          </h3>
          {developerName ? <p className="text-sm text-muted-foreground">{developerName}</p> : null}
          {location ? (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{location}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-auto">
          <p className="text-xs text-muted-foreground">Starting from</p>
          <PriceDisplay amountMinor={startingPriceMinor} currency={currency} />
        </div>
      </div>
    </LinkComponent>
  );
}

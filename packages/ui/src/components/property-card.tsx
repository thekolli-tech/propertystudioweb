import * as React from 'react';
import { Heart, MapPin } from 'lucide-react';

import { cn } from '../lib/utils';
import { ImagePlaceholder } from './image-placeholder';
import { PriceDisplay } from './price-display';
import { StatusBadge, availabilityTone } from './status-badge';

export type PropertyCardProps = {
  href: string;
  title: string;
  publicId: string;
  location?: string | null;
  projectLabel?: string | null;
  configuration?: string | null;
  bedrooms?: number | null;
  areaLabel?: string | null;
  priceMinor: string;
  currency?: string;
  availabilityStatus?: string | null;
  imageSlot?: React.ReactNode;
  className?: string;
  linkComponent?: React.ElementType;
};

function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}

export function PropertyCard({
  href,
  title,
  publicId,
  location,
  projectLabel,
  configuration,
  bedrooms,
  areaLabel,
  priceMinor,
  currency = 'INR',
  availabilityStatus,
  imageSlot,
  className,
  linkComponent: LinkComponent = 'a',
}: PropertyCardProps) {
  const configLabel =
    configuration != null ? humanize(configuration) : bedrooms != null ? `${bedrooms} BHK` : null;

  return (
    <LinkComponent
      href={href}
      className={cn(
        'ps-card-elevated group flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="relative overflow-hidden">
        {imageSlot ?? <ImagePlaceholder ratio="card" />}
        {availabilityStatus ? (
          <div className="absolute left-3 top-3">
            <StatusBadge tone={availabilityTone(availabilityStatus)}>
              {humanize(availabilityStatus)}
            </StatusBadge>
          </div>
        ) : null}
        <span
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/95 text-muted-foreground shadow-sm"
          aria-hidden
        >
          <Heart className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {publicId}
          </p>
          <h3 className="line-clamp-2 font-display text-[0.95rem] font-semibold leading-snug text-foreground">
            {title}
          </h3>
          {location ? (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{location}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {configLabel ? (
            <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">
              {configLabel}
            </span>
          ) : null}
          {areaLabel ? (
            <span className="rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground">
              {areaLabel}
            </span>
          ) : null}
          {projectLabel ? <span className="line-clamp-1">{projectLabel}</span> : null}
        </div>
        <PriceDisplay amountMinor={priceMinor} currency={currency} />
      </div>
    </LinkComponent>
  );
}

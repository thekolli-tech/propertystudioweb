import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './ui/button';

export type PaginationProps = {
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  previousHref?: string;
  nextHref?: string;
  label?: string;
  className?: string;
  linkComponent?: React.ElementType;
};

export function Pagination({
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  previousHref,
  nextHref,
  label = 'Pagination',
  className,
  linkComponent: LinkComponent = 'a',
}: PaginationProps) {
  return (
    <nav
      aria-label={label}
      className={cn('flex items-center justify-between gap-3', className)}
    >
      {previousHref ? (
        <Button asChild variant="outline" size="sm" disabled={!hasPrevious}>
          <LinkComponent href={previousHref} aria-disabled={!hasPrevious}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </LinkComponent>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={!hasPrevious} onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </Button>
      )}
      {nextHref ? (
        <Button asChild variant="outline" size="sm" disabled={!hasNext}>
          <LinkComponent href={nextHref} aria-disabled={!hasNext}>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </LinkComponent>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </nav>
  );
}

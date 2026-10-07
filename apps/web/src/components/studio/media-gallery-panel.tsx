import type { MediaCmsDetail } from '@property-studio/contracts';
import { Badge, EmptyState, cn } from '@property-studio/ui';

export type MediaGalleryPanelProps = {
  media: MediaCmsDetail[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

/**
 * Broadcast / studio media strip. Renders only supplied API rows — never invents assets.
 */
export function MediaGalleryPanel({
  media,
  title = 'Media',
  emptyTitle = 'No media yet',
  emptyDescription = 'Published media assets will appear here when available from the media CMS.',
  className,
}: MediaGalleryPanelProps) {
  return (
    <section className={cn('space-y-4', className)} aria-labelledby="studio-media-heading">
      <h2
        id="studio-media-heading"
        className="font-display text-[calc(1.125rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)] tracking-tight"
      >
        {title}
      </h2>
      {media.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => (
            <li
              key={item.publicId}
              className="ps-broadcast-chart rounded-[var(--radius)] border-2 border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.mediaType}</Badge>
                {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
              </div>
              <p className="mt-3 font-medium text-foreground">
                {item.title ?? item.slug ?? item.publicId}
              </p>
              {item.caption || item.description ? (
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                  {item.caption ?? item.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">{item.publicId}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

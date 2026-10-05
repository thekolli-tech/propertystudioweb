import * as React from 'react';
import { ImageIcon } from 'lucide-react';

import { cn } from '../lib/utils';

export type ImagePlaceholderProps = {
  className?: string;
  label?: string;
  ratio?: 'video' | 'square' | 'wide';
};

export function ImagePlaceholder({
  className,
  label = 'Image coming soon',
  ratio = 'video',
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-secondary text-muted-foreground',
        ratio === 'video' && 'aspect-[16/10]',
        ratio === 'square' && 'aspect-square',
        ratio === 'wide' && 'aspect-[21/9]',
        className,
      )}
      role="img"
      aria-label={label}
    >
      <ImageIcon className="h-7 w-7 opacity-60" aria-hidden />
      <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}

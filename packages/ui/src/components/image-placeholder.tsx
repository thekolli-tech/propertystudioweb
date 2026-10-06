import * as React from 'react';
import { ImageIcon } from 'lucide-react';

import { cn } from '../lib/utils';

export type ImagePlaceholderProps = {
  className?: string;
  label?: string;
  ratio?: 'video' | 'square' | 'wide' | 'card';
};

/** Editorial placeholder — never invents property photography. */
export function ImagePlaceholder({
  className,
  label = 'Image coming soon',
  ratio = 'card',
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden text-muted-foreground',
        'bg-[linear-gradient(145deg,hsl(40_18%_94%)_0%,hsl(40_14%_90%)_45%,hsl(222_12%_88%)_100%)]',
        ratio === 'card' && 'aspect-[4/3]',
        ratio === 'video' && 'aspect-[16/10]',
        ratio === 'square' && 'aspect-square',
        ratio === 'wide' && 'aspect-[21/9]',
        className,
      )}
      role="img"
      aria-label={label}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />
      <ImageIcon className="relative h-6 w-6 opacity-50" aria-hidden />
      <span className="relative text-[11px] font-medium tracking-[0.14em] uppercase">{label}</span>
    </div>
  );
}

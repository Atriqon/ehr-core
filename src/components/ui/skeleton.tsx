import { cn } from '@/lib/utils';

// Lightweight skeleton placeholder. Used by route-level loading.tsx files and
// the global search dialog. No dependency — just a pulsing zinc block.
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800',
        className,
      )}
      {...props}
    />
  );
}

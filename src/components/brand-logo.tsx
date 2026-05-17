import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** Render only the icon mark, no wordmark. */
  iconOnly?: boolean;
  /** Use light text — for placement on the dark sidebar / branding panel. */
  onDark?: boolean;
  /** Size of the icon mark. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const markSizes = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-14 w-14 rounded-2xl',
} as const;

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
} as const;

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
} as const;

/** Hisamed brand mark + wordmark. Single source of truth for the logo. */
export function BrandLogo({
  iconOnly = false,
  onDark = false,
  size = 'md',
  className,
}: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-teal-600 shadow-sm',
          markSizes[size],
        )}
      >
        <Activity className={cn('text-white', iconSizes[size])} strokeWidth={2.5} />
      </span>
      {!iconOnly && (
        <span
          className={cn(
            'font-semibold tracking-tight',
            textSizes[size],
            onDark ? 'text-white' : 'text-zinc-900',
          )}
        >
          Hisamed
        </span>
      )}
    </div>
  );
}

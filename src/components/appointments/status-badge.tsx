import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/lib/validators/appointment';

interface StatusConfig {
  label: string;
  classes: string;
}

// Vision redesign — capsule pills with soft alpha fills instead of the flat
// 100-weight Tailwind surfaces.
export const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  scheduled:   { label: 'Programada',  classes: 'bg-zinc-500/12 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400' },
  confirmed:   { label: 'Confirmada',  classes: 'bg-blue-600/12 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  waiting:     { label: 'En espera',   classes: 'bg-amber-600/14 text-amber-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  in_progress: { label: 'En consulta', classes: 'bg-orange-600/14 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  completed:   { label: 'Completada',  classes: 'bg-green-700/14 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  cancelled:   { label: 'Cancelada',   classes: 'bg-red-600/12 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  no_show:     { label: 'No asistió',  classes: 'bg-red-800/14 text-red-800 dark:bg-red-950/60 dark:text-red-300' },
};

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold tracking-[-0.005em]',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

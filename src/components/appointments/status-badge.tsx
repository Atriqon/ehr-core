import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/lib/validators/appointment';

interface StatusConfig {
  label: string;
  classes: string;
}

export const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  scheduled:   { label: 'Programada',  classes: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  confirmed:   { label: 'Confirmada',  classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  waiting:     { label: 'En espera',   classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  in_progress: { label: 'En consulta', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  completed:   { label: 'Completada',  classes: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  cancelled:   { label: 'Cancelada',   classes: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' },
  no_show:     { label: 'No asistió',  classes: 'bg-red-200 text-red-800 dark:bg-red-950/60 dark:text-red-300' },
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
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

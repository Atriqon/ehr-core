import { Calendar } from 'lucide-react';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { STATUS_CONFIG } from '@/components/appointments/status-badge';
import type { AppointmentWithDetails } from '@/queries/appointments';
import type { AppointmentStatus } from '@/lib/validators/appointment';

interface DailyViewProps {
  appointments: AppointmentWithDetails[];
  date: Date;
  showDoctor?: boolean;
  /** True when `date` is the clinic-timezone "today" — drives the empty copy. */
  isToday?: boolean;
}

// Soft timeline-dot color per appointment status.
const DOT_COLOR: Record<AppointmentStatus, string> = {
  scheduled: 'bg-zinc-300',
  confirmed: 'bg-blue-400',
  waiting: 'bg-amber-400',
  in_progress: 'bg-orange-400',
  completed: 'bg-teal-500',
  cancelled: 'bg-red-300',
  no_show: 'bg-red-400',
};

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function DailyView({
  appointments,
  date,
  showDoctor = false,
  isToday = false,
}: DailyViewProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <Calendar className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {isToday
            ? 'No tienes citas programadas para hoy'
            : 'Sin citas para este día'}
        </p>
        <p className="mt-1 max-w-sm text-xs text-zinc-400 dark:text-zinc-500">
          {isToday
            ? 'Las próximas citas aparecerán aquí cuando sean registradas.'
            : formatDateHeader(date)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium capitalize text-zinc-500 dark:text-zinc-400">
        {formatDateHeader(date)} · {appointments.length} cita
        {appointments.length !== 1 ? 's' : ''}
      </p>
      {/* Vertical timeline */}
      <ol className="relative ml-1.5 space-y-3 border-l-2 border-zinc-200 pl-6 dark:border-zinc-700">
        {appointments.map((appt) => (
          <li key={appt.id} className="relative">
            <span
              aria-hidden
              className={`absolute -left-[1.95rem] top-4 h-3.5 w-3.5 rounded-full border-2 border-white ring-1 ring-zinc-200 dark:border-zinc-900 dark:ring-zinc-700 ${
                DOT_COLOR[appt.status] ?? DOT_COLOR.scheduled
              }`}
              title={STATUS_CONFIG[appt.status]?.label}
            />
            <AppointmentCard appointment={appt} showDoctor={showDoctor} />
          </li>
        ))}
      </ol>
    </div>
  );
}

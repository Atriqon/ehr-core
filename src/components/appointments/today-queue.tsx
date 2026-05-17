import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { StatusBadge } from '@/components/appointments/status-badge';
import type { AppointmentWithDetails } from '@/queries/appointments';

interface TodayQueueProps {
  appointments: AppointmentWithDetails[];
  showDoctor?: boolean;
  compact?: boolean;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function TodayQueue({ appointments, showDoctor = false, compact = false }: TodayQueueProps) {
  const active = appointments.filter(
    (a) => a.status !== 'cancelled' && a.status !== 'no_show',
  );

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200/80 bg-linear-to-br from-white to-zinc-50/70 py-12 text-center shadow-sm dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-900">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:ring-teal-800">
          <Users className="h-5 w-5 text-teal-500 dark:text-teal-400" />
        </span>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Sin citas hoy
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Las citas programadas para hoy se mostrarán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cola del día
          </span>
        </div>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
          {active.length} activa{active.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {appointments.map((appt) => {
          const name = `${appt.patient.firstName} ${appt.patient.lastName}`;
          return (
            <li key={appt.id} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                {appt.patient.firstName[0]}
                {appt.patient.lastName[0]}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">
                    {formatTime(appt.startTime)}
                  </span>
                  {!compact && <StatusBadge status={appt.status} />}
                </div>
                <Link
                  href={`/pacientes/${appt.patientId}`}
                  className="block truncate text-sm font-medium text-zinc-900 hover:text-teal-700 dark:text-zinc-100 dark:hover:text-teal-400"
                >
                  {name}
                </Link>
                {showDoctor && (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {appt.doctor.fullName}
                  </p>
                )}
                {appt.reason && !compact && (
                  <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{appt.reason}</p>
                )}
              </div>

              {compact && <StatusBadge status={appt.status} />}
            </li>
          );
        })}
      </ul>

      {appointments.length > 5 && (
        <div className="border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
          <Link
            href="/agenda"
            className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Ver todas las citas →
          </Link>
        </div>
      )}
    </div>
  );
}

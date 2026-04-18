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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <Users className="mb-2 h-6 w-6 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin citas hoy</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cola del día
          </span>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {active.length} activa{active.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {appointments.map((appt) => {
          const name = `${appt.patient.firstName} ${appt.patient.lastName}`;
          return (
            <li key={appt.id} className="flex items-center gap-3 px-4 py-3">
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
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
                  className="block truncate text-sm font-medium text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
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
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Ver todas las citas →
          </Link>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { StatusBadge } from '@/components/appointments/status-badge';
import type { AppointmentWithDetails } from '@/queries/appointments';
import { toDateStr, type WeekStartsOn } from '@/lib/dates';

interface WeeklyViewProps {
  appointments: AppointmentWithDetails[];
  weekStart: Date;
  /** YYYY-MM-DD of "today" in the clinic's timezone — used to highlight the right column. */
  todayStr: string;
  /**
   * First day of the week per the clinic's settings. Not strictly required
   * for rendering (because `weekStart` already encodes the order) but kept
   * for clarity and future per-clinic styling.
   */
  weekStartsOn: WeekStartsOn;
  showDoctor?: boolean;
}

// Indexed by JavaScript's Date#getDay() (0 = Sunday … 6 = Saturday). We do
// NOT rotate this array based on `weekStartsOn`; instead each header looks
// up its own label using its actual day-of-week. Layout order is determined
// by `weekStart` (which is already the first day per the clinic's settings).
const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

export function WeeklyView({
  appointments,
  weekStart,
  todayStr,
  // weekStartsOn is part of the prop contract but the rendering logic
  // already follows whatever order `weekStart` puts in, so it is unused.
  weekStartsOn: _weekStartsOn,
  showDoctor = false,
}: WeeklyViewProps) {
  // Build 7 days
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = todayStr;

  // Group by date string
  const byDate = new Map<string, AppointmentWithDetails[]>();
  for (const appt of appointments) {
    const existing = byDate.get(appt.date) ?? [];
    existing.push(appt);
    byDate.set(appt.date, existing);
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7 gap-1">
        {/* Headers */}
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === today;
          const count = byDate.get(dateStr)?.length ?? 0;
          return (
            <div
              key={dateStr}
              className={`rounded-t-lg px-2 py-2 text-center ${
                isToday
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              <p className="text-xs font-medium">{WEEKDAY_SHORT[day.getDay()]}</p>
              <p className={`text-lg font-bold leading-tight ${isToday ? '' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {day.getDate()}
              </p>
              {count > 0 && (
                <p className={`text-xs ${isToday ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-500'}`}>
                  {count} cita{count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          );
        })}

        {/* Day columns */}
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const dayAppts = byDate.get(dateStr) ?? [];
          const isToday = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`min-h-[200px] rounded-b-lg border p-1.5 ${
                isToday
                  ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20'
                  : 'border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              {dayAppts.length === 0 ? (
                <div className="flex h-full min-h-[120px] items-center justify-center">
                  <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {dayAppts.map((appt) => (
                    <WeeklyApptChip key={appt.id} appointment={appt} showDoctor={showDoctor} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WeeklyApptChipProps {
  appointment: AppointmentWithDetails;
  showDoctor: boolean;
}

function WeeklyApptChip({ appointment, showDoctor }: WeeklyApptChipProps) {
  const name = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

  return (
    <Link href={`/pacientes/${appointment.patientId}`} className="block group">
      <div className="rounded-md border border-zinc-200 bg-white p-1.5 text-xs shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800">
        <p className="font-medium text-zinc-600 dark:text-zinc-400">
          {formatTime(appointment.startTime)}
        </p>
        <p className="mt-0.5 truncate font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
          {name}
        </p>
        {showDoctor && (
          <p className="mt-0.5 truncate text-zinc-500 dark:text-zinc-500">
            {appointment.doctor.fullName}
          </p>
        )}
        <StatusBadge status={appointment.status} className="mt-1" />
      </div>
    </Link>
  );
}

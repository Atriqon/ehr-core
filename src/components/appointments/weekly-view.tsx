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
      <div className="grid min-w-175 grid-cols-7 gap-1">
        {/* Headers */}
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === today;
          const count = byDate.get(dateStr)?.length ?? 0;
          return (
            <div
              key={dateStr}
              className={`rounded-t-[14px] px-2 py-2.5 text-center ${
                isToday
                  ? 'bg-[linear-gradient(135deg,#14B8A6,#0F766E)] text-white shadow-[0_8px_18px_-8px_rgba(13,148,136,0.5)]'
                  : 'bg-white/55 text-slate-600 backdrop-blur-md'
              }`}
            >
              <p className="text-[11px] font-medium">{WEEKDAY_SHORT[day.getDay()]}</p>
              <p className={`text-lg font-bold leading-tight ${isToday ? '' : 'text-slate-900'}`}>
                {day.getDate()}
              </p>
              {count > 0 && (
                <p className={`text-[11px] ${isToday ? 'text-teal-100' : 'text-slate-500'}`}>
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
              className={`min-h-50 rounded-b-[14px] border p-1.5 backdrop-blur-md ${
                isToday
                  ? 'border-teal-600/25 bg-teal-50/55'
                  : 'border-white/60 bg-white/45'
              }`}
            >
              {dayAppts.length === 0 ? (
                <div className="flex h-full min-h-30 items-center justify-center">
                  <span className="text-xs text-slate-300">—</span>
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
      <div className="rounded-[10px] border border-white/70 bg-white/85 p-1.5 text-xs shadow-[0_2px_6px_-2px_rgba(15,23,42,0.1)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-8px_rgba(15,23,42,0.2)]">
        <p className="font-medium text-slate-500">
          {formatTime(appointment.startTime)}
        </p>
        <p className="mt-0.5 truncate font-semibold text-slate-900 group-hover:text-teal-700">
          {name}
        </p>
        {showDoctor && (
          <p className="mt-0.5 truncate text-slate-500">
            {appointment.doctor.fullName}
          </p>
        )}
        <StatusBadge status={appointment.status} className="mt-1" />
      </div>
    </Link>
  );
}

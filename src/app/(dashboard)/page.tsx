import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { CalendarDays, ChevronRight, FileText, Hourglass, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { getClinicSettings } from '@/queries/clinic';
import { getDashboardStats } from '@/queries/dashboard';
import { getAppointmentsByDate } from '@/queries/appointments';
import { todayInTz, parseDateStr } from '@/lib/dates';
import { TodayQueue } from '@/components/appointments/today-queue';
import { StatusBadge } from '@/components/appointments/status-badge';

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/** Time-of-day greeting derived from the clinic's timezone (never the server's). */
function getGreeting(timezone: string): string {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: timezone,
  }).format(new Date());
  const hour = parseInt(hourStr, 10) % 24;
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [{ timezone }, user] = await Promise.all([
    getClinicSettings(session.clinicId),
    db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { fullName: true },
    }),
  ]);
  const today = todayInTz(timezone);
  const todayDate = parseDateStr(today)!;
  const isDoctor = session.role === 'doctor';

  const [stats, todayAppointments] = await Promise.all([
    getDashboardStats(session.clinicId, timezone),
    getAppointmentsByDate(
      session.clinicId,
      todayDate,
      isDoctor ? session.userId : undefined,
    ),
  ]);

  const nextAppointment = isDoctor
    ? todayAppointments.find(
        (a) => a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no_show',
      )
    : null;

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const displayName = isDoctor ? `Dr. ${firstName}` : firstName;

  const statCards = [
    {
      label: 'Pacientes activos',
      value: stats.activePatients,
      icon: Users,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      ring: 'ring-teal-100',
    },
    {
      label: 'Citas hoy',
      value: stats.todayTotal,
      icon: CalendarDays,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      ring: 'ring-blue-100',
    },
    {
      label: 'En espera',
      value: stats.todayByStatus.waiting ?? 0,
      icon: Hourglass,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      ring: 'ring-amber-100',
    },
    {
      label: 'Consultas del mes',
      value: stats.monthlyConsultations,
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      ring: 'ring-violet-100',
    },
  ];

  const dateLabel = new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'full',
    timeZone: timezone,
  }).format(new Date());

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Branded greeting header — carries the login's teal/slate identity. */}
      <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200/80 bg-linear-to-br from-white via-white to-teal-50/50 p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {getGreeting(timezone)}
          {displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="mt-1 text-sm capitalize text-zinc-500">{dateLabel}</p>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, ring }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200/80 bg-linear-to-br from-white to-zinc-50/70 p-5 shadow-sm ring-1 ring-zinc-900/2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">
                  {value}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ring-1 ${bg} ${ring}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next patient — doctors only */}
        {isDoctor && (
          <div className="lg:col-span-1">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              Próximo paciente
            </h2>
            {nextAppointment ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                    {nextAppointment.patient.firstName[0]}
                    {nextAppointment.patient.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-900">
                      {nextAppointment.patient.firstName} {nextAppointment.patient.lastName}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-zinc-500">
                        {formatTime(nextAppointment.startTime)}
                      </span>
                      <StatusBadge status={nextAppointment.status} />
                    </div>
                  </div>
                </div>
                {nextAppointment.reason && (
                  <p className="mt-3 line-clamp-2 text-sm text-zinc-600">
                    {nextAppointment.reason}
                  </p>
                )}
                <Link
                  href={`/pacientes/${nextAppointment.patientId}`}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
                >
                  Atender paciente
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200/80 bg-linear-to-br from-white to-teal-50/40 py-12 text-center shadow-sm">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 ring-1 ring-teal-100">
                  <Users className="h-5 w-5 text-teal-500" />
                </span>
                <p className="text-sm font-medium text-zinc-700">
                  Sin pacientes pendientes
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Las citas activas del día aparecerán aquí.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Today's queue */}
        <div className={isDoctor ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">
            {isDoctor ? 'Mis citas de hoy' : 'Pacientes del día'}
          </h2>
          <TodayQueue appointments={todayAppointments} showDoctor={!isDoctor} />
        </div>
      </div>
    </div>
  );
}

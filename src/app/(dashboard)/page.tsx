import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, ChevronRight, FileText, UserPlus, Users } from 'lucide-react';
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

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { timezone } = await getClinicSettings(session.clinicId);
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

  const statCards = [
    {
      label: 'Pacientes activos',
      value: stats.activePatients,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Citas hoy',
      value: stats.todayTotal,
      icon: Calendar,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: 'Consultas del mes',
      value: stats.monthlyConsultations,
      icon: FileText,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Pacientes nuevos (mes)',
      value: stats.newPatientsThisMonth,
      icon: UserPlus,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  const dateLabel = new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'full',
    timeZone: timezone,
  }).format(new Date());

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm capitalize text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className="mt-1.5 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {value}
                </p>
              </div>
              <div className={`rounded-lg p-2 ${bg}`}>
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
            <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Próximo paciente
            </h2>
            {nextAppointment ? (
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {nextAppointment.patient.firstName[0]}
                    {nextAppointment.patient.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {nextAppointment.patient.firstName} {nextAppointment.patient.lastName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatTime(nextAppointment.startTime)}
                      </span>
                      <StatusBadge status={nextAppointment.status} />
                    </div>
                  </div>
                </div>
                {nextAppointment.reason && (
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {nextAppointment.reason}
                  </p>
                )}
                <Link
                  href={`/pacientes/${nextAppointment.patientId}`}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Ver ficha del paciente
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Sin pacientes pendientes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Today's queue */}
        <div className={isDoctor ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {isDoctor ? 'Mis citas de hoy' : 'Citas de hoy'}
          </h2>
          <TodayQueue appointments={todayAppointments} showDoctor={!isDoctor} />
        </div>
      </div>
    </div>
  );
}

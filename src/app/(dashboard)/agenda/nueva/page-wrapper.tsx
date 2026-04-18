import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getDoctorsForClinic } from '@/queries/appointments';
import { getClinicSettings } from '@/queries/clinic';
import { todayInTz } from '@/lib/dates';
import { NewAppointmentForm } from './new-appointment-form';

export async function NewAppointmentPageWrapper() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [doctors, { timezone }] = await Promise.all([
    getDoctorsForClinic(session.clinicId),
    getClinicSettings(session.clinicId),
  ]);
  const todayStr = todayInTz(timezone);

  return (
    <div className="p-6 lg:p-8">
      <Link
        href="/agenda"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la agenda
      </Link>

      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Nueva cita
        </h1>
        <NewAppointmentForm doctors={doctors} todayStr={todayStr} />
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Suspense } from 'react';
import { UserPlus, Users } from 'lucide-react';

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getPatients } from '@/queries/patients';
import { getClinicSettings } from '@/queries/clinic';
import { todayInTz } from '@/lib/dates';
import { PatientSearchBar } from '@/components/patients/patient-search-bar';
import { PatientList } from '@/components/patients/patient-list';

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function PacientesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const search = params.q ?? '';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [data, clinicSettings] = await Promise.all([
    getPatients(session.clinicId, { search, page, includeObstetric: session.role !== 'receptionist' }),
    getClinicSettings(session.clinicId),
  ]);
  const todayStr = todayInTz(clinicSettings.timezone);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Branded page header */}
      <div className="mb-6 flex flex-col gap-3 overflow-hidden rounded-xl border border-zinc-200/80 bg-linear-to-br from-white via-white to-teal-50/50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 ring-1 ring-teal-100">
            <Users className="h-5 w-5 text-teal-600" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Pacientes
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {data.total} paciente{data.total !== 1 ? 's' : ''} registrado{data.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link
          href="/pacientes/nuevo"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo paciente
        </Link>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <Suspense>
          <PatientSearchBar />
        </Suspense>
      </div>

      {/* List */}
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        }
      >
        <PatientList data={data} todayStr={todayStr} canCreate />
      </Suspense>
    </div>
  );
}

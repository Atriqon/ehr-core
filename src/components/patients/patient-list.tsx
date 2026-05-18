'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, SearchX, UserPlus, Users } from 'lucide-react';
import type { PatientListItem, PatientsPage } from '@/queries/patients';
import { PatientAvatar } from '@/components/patients/patient-avatar';
import { calcGestationalAge } from '@/lib/obstetric';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const ID_TYPE_LABELS: Record<string, string> = {
  cedula: 'V-',
  passport: 'P-',
  other: '',
};

interface PatientListProps {
  data: PatientsPage;
  todayStr: string;
  /** When true, the empty state shows the "Nuevo paciente" CTA. */
  canCreate?: boolean;
}

export function PatientList({ data, todayStr, canCreate = false }: PatientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (data.items.length === 0) {
    // Distinguish "no patients at all" from "search returned nothing": the
    // first invites the user to register their first patient, the second
    // just confirms there are no matches.
    const isSearching = (searchParams.get('q') ?? '').trim().length > 0;

    if (isSearching) {
      return (
        <div className="glass-card flex flex-col items-center justify-center rounded-[22px] py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-zinc-100 text-zinc-400 shadow-[inset_0_0_0_1px_var(--color-zinc-200)]">
            <SearchX className="h-7 w-7" />
          </span>
          <p className="mt-2 text-[15px] font-semibold text-slate-800">
            No se encontraron resultados
          </p>
          <p className="mt-1 max-w-80 text-[13px] leading-relaxed text-slate-500">
            Intenta con otro término de búsqueda.
          </p>
        </div>
      );
    }

    return (
      <div className="glass-card flex flex-col items-center justify-center rounded-[22px] py-14 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#F0FDFA,#CCFBF1)] text-teal-600 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.15),0_8px_18px_-8px_rgba(13,148,136,0.35)]">
          <Users className="h-7 w-7" />
        </span>
        <p className="mt-2 text-[15px] font-semibold text-slate-800">
          Registra tu primer paciente
        </p>
        <p className="mt-1 max-w-80 text-[13px] leading-relaxed text-slate-500">
          Agrega un paciente para comenzar a gestionar su historia clínica.
        </p>
        {canCreate && (
          <Link
            href="/pacientes/nuevo"
            className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Nuevo paciente
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="glass-surface overflow-hidden rounded-[20px]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-900/6 bg-slate-50/60">
              {['Nombre', 'Documento', 'Teléfono', 'Edad', 'Última cita'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4.5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/4">
            {data.items.map((patient: PatientListItem) => (
              <PatientRow key={patient.id} patient={patient} todayStr={todayStr} />
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-900/5 px-4.5 py-3">
          <p className="text-xs text-slate-500">
            {data.total} paciente{data.total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(data.page - 1)}
              disabled={data.page <= 1}
              className="glass-input inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs text-slate-500">
              {data.page} / {data.totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(data.page + 1)}
              disabled={data.page >= data.totalPages}
              className="glass-input inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientRow({ patient, todayStr }: { patient: PatientListItem; todayStr: string }) {
  const router = useRouter();
  const prefix = ID_TYPE_LABELS[patient.idType] ?? '';
  const age = calcAge(patient.dateOfBirth);
  const href = `/pacientes/${patient.id}`;

  const ga =
    patient.sex === 'F' && patient.fumDate && !patient.pregnancyEnded
      ? calcGestationalAge(patient.fumDate, todayStr)
      : null;
  const activePregnancy = ga && ga.weeks < 42 ? ga : null;
  const staleFUM = ga !== null && ga.weeks >= 42;

  return (
    <tr
      className="group cursor-pointer transition-colors duration-200 hover:bg-teal-600/4 [&_td]:px-4.5 [&_td]:py-4"
      onClick={() => router.push(href)}
    >
      <td>
        <div className="flex items-center gap-3">
          <PatientAvatar
            patientId={patient.id}
            firstName={patient.firstName}
            lastName={patient.lastName}
            avatarStorageKey={patient.avatarStorageKey}
            className="h-9 w-9"
            textClassName="text-xs"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={href}
                prefetch={false}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold tracking-[-0.005em] text-slate-900 transition-colors group-hover:text-teal-700 focus-visible:underline focus-visible:outline-none"
              >
                {patient.lastName}, {patient.firstName}
              </Link>
              {activePregnancy && (
                <span className="inline-flex items-center rounded-full bg-pink-700/12 px-2.5 py-0.5 text-[11px] font-semibold text-pink-700">
                  🤰 {activePregnancy.weeks}s+{activePregnancy.days}d
                </span>
              )}
              {staleFUM && (
                <span className="inline-flex items-center rounded-full bg-amber-600/14 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                  ⚠️ Verificar FUM
                </span>
              )}
            </div>
            {!patient.isActive && (
              <span className="block text-xs text-slate-400">(Inactivo)</span>
            )}
          </div>
        </div>
      </td>
      <td className="text-slate-600">
        {prefix}
        {patient.idNumber}
      </td>
      <td className="text-slate-600">{patient.phone ?? '—'}</td>
      <td className="text-slate-600">{age} años</td>
      <td className="text-slate-400">—</td>
    </tr>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Shield, Users, Upload, Building2 } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getFullClinic } from '@/queries/clinic';
import { updateClinicSettings } from '@/actions/clinic';
import { ClinicSettingsForm } from '@/components/settings/clinic-settings-form';

const adminLinks = [
  {
    href: '/configuracion/usuarios',
    icon: Users,
    label: 'Gestión de usuarios',
    description: 'Crear, editar y desactivar usuarios de la clínica',
  },
  {
    href: '/configuracion/importar',
    icon: Upload,
    label: 'Importar pacientes',
    description: 'Cargar pacientes desde un archivo CSV',
  },
  {
    href: '/configuracion/auditoria',
    icon: Shield,
    label: 'Log de auditoría',
    description: 'Historial de acciones realizadas en el sistema',
  },
];

export default async function ConfiguracionPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Configuración
        </h1>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No tienes permisos para acceder a la configuración del sistema.
        </p>
      </div>
    );
  }

  const clinic = await getFullClinic(session.clinicId);
  if (!clinic) redirect('/login');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Configuración
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Ajustes del sistema</p>

      {/* Clinic Settings */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30">
            <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Datos de la clínica
          </h2>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <ClinicSettingsForm clinic={clinic} action={updateClinicSettings} />
        </div>
      </section>

      {/* Admin links */}
      <section className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Administración
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adminLinks.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-teal-700 dark:hover:bg-teal-900/20"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-teal-100 dark:bg-zinc-800 dark:group-hover:bg-teal-900/40">
                <Icon className="h-5 w-5 text-zinc-600 group-hover:text-teal-700 dark:text-zinc-400 dark:group-hover:text-teal-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

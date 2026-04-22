import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getClinicSettings } from '@/queries/clinic';
import { getClinicUsers } from '@/queries/users';
import { createUser, updateUser, resetUserPassword } from '@/actions/users';
import { UserManagement } from '@/components/settings/user-management';

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') notFound();

  const [clinicSettings, users] = await Promise.all([
    getClinicSettings(session.clinicId),
    getClinicUsers(session.clinicId),
  ]);

  return (
    <div className="p-6 lg:p-8">
      <Link
        href="/configuracion"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Configuración
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Gestión de usuarios
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Usuarios con acceso a la clínica
          </p>
        </div>
      </div>

      <UserManagement
        users={users}
        currentUserId={session.userId}
        createAction={createUser}
        updateAction={updateUser}
        resetAction={resetUserPassword}
        timezone={clinicSettings.timezone}
      />
    </div>
  );
}

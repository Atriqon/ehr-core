import { notFound, redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getClinicSettings } from '@/queries/clinic';
import { getClinicUsers } from '@/queries/users';
import { createUser, updateUser, resetUserPassword } from '@/actions/users';
import { UserManagement } from '@/components/settings/user-management';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { settingsTrail } from '@/lib/breadcrumbs';

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') notFound();

  const [clinicSettings, users] = await Promise.all([
    getClinicSettings(session.clinicId),
    getClinicUsers(session.clinicId),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Breadcrumbs items={settingsTrail({ label: 'Usuarios' })} />

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30">
          <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
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

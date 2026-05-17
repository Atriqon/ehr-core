'use client';

import { useActionState, useState } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserActionState } from '@/actions/users';
import type { UserListItem } from '@/queries/users';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
};

// ─── Create User Modal ────────────────────────────────────────────────────────

interface CreateUserModalProps {
  action: (state: UserActionState, formData: FormData) => Promise<UserActionState>;
  onClose: () => void;
}

export function CreateUserModal({ action, onClose }: CreateUserModalProps) {
  const [state, formAction, isPending] = useActionState(action, null);

  const errors =
    state && !state.success && 'fieldErrors' in state ? state.fieldErrors : {};

  function field(name: string) {
    return errors?.[name]?.[0] ?? '';
  }

  if (state?.success) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Nuevo usuario
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-6">
          {state && !state.success && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{state.error}</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              name="full_name"
              type="text"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {field('full_name') && (
              <p className="mt-1 text-xs text-red-600">{field('full_name')}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {field('email') && (
              <p className="mt-1 text-xs text-red-600">{field('email')}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={10}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-400">Mínimo 10 caracteres</p>
            {field('password') && (
              <p className="mt-1 text-xs text-red-600">{field('password')}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              defaultValue="receptionist"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {field('role') && (
              <p className="mt-1 text-xs text-red-600">{field('role')}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear usuario
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

interface EditUserModalProps {
  user: UserListItem;
  currentUserId: string;
  updateAction: (state: UserActionState, formData: FormData) => Promise<UserActionState>;
  resetAction: (state: UserActionState, formData: FormData) => Promise<UserActionState>;
  onClose: () => void;
}

export function EditUserModal({
  user,
  currentUserId,
  updateAction,
  resetAction,
  onClose,
}: EditUserModalProps) {
  const [tab, setTab] = useState<'edit' | 'password'>('edit');
  const [isActive, setIsActive] = useState(user.isActive);
  const [editState, editAction, editPending] = useActionState(updateAction, null);
  const [resetState, resetFormAction, resetPending] = useActionState(resetAction, null);

  const editErrors =
    editState && !editState.success && 'fieldErrors' in editState ? editState.fieldErrors : {};

  const isSelf = user.id === currentUserId;

  if (editState?.success || resetState?.success) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Editar usuario
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="border-b border-zinc-100 px-6 dark:border-zinc-700">
          <nav className="-mb-px flex gap-1">
            {(['edit', 'password'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'px-3 py-2.5 text-sm font-medium transition-colors',
                  tab === t
                    ? 'border-b-2 border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400'
                    : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
                ].join(' ')}
              >
                {t === 'edit' ? 'Datos' : 'Contraseña'}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'edit' && (
          <form action={editAction} className="space-y-4 p-6">
            <input type="hidden" name="user_id" value={user.id} />

            {editState && !editState.success && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{editState.error}</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nombre completo
              </label>
              <input
                name="full_name"
                type="text"
                defaultValue={user.fullName}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {editErrors?.full_name?.[0] && (
                <p className="mt-1 text-xs text-red-600">{editErrors.full_name[0]}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Rol
              </label>
              <select
                name="role"
                defaultValue={user.role}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={isSelf}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-600 disabled:opacity-50"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Usuario activo
                  {isSelf && (
                    <span className="ml-1 text-xs text-zinc-400">(no puedes desactivarte)</span>
                  )}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={editPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editPending}>
                {editPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        )}

        {tab === 'password' && (
          <form action={resetFormAction} className="space-y-4 p-6">
            <input type="hidden" name="user_id" value={user.id} />

            {resetState && !resetState.success && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{resetState.error}</p>
              </div>
            )}

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Define una nueva contraseña para{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{user.fullName}</span>.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <input
                name="new_password"
                type="password"
                required
                minLength={10}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p className="mt-1 text-xs text-zinc-400">Mínimo 10 caracteres</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={resetPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetPending}>
                {resetPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resetear contraseña
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

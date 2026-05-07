'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { removePatientAvatar } from '@/actions/patient-avatar';

interface PatientAvatarRemoveButtonProps {
  patientId: string;
}

export function PatientAvatarRemoveButton({ patientId }: PatientAvatarRemoveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    if (!window.confirm('¿Eliminar la foto del paciente?')) return;

    const fd = new FormData();
    fd.append('patient_id', patientId);

    startTransition(async () => {
      const result = await removePatientAvatar(null, fd);
      if (result && !result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Eliminando
          </>
        ) : (
          <>
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar foto
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

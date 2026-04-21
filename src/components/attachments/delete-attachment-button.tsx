'use client';

import { useActionState, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteAttachment, type AttachmentActionState } from '@/actions/attachments';

interface DeleteAttachmentButtonProps {
  attachmentId: string;
  fileName: string;
}

export function DeleteAttachmentButton({
  attachmentId,
  fileName,
}: DeleteAttachmentButtonProps) {
  const [state, formAction, isPending] = useActionState<AttachmentActionState, FormData>(
    deleteAttachment,
    null,
  );
  const [confirming, setConfirming] = useState(false);

  // Two-step confirm: first click flips to a "confirmar" button, second click
  // actually submits. Keeps us from accidental deletes without pulling a
  // modal primitive into this small surface.
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        aria-label={`Eliminar ${fileName}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-1">
      <input type="hidden" name="attachment_id" value={attachmentId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-red-600 px-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Confirmar
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="h-7 rounded-md px-2 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Cancelar
      </button>
      {state && !state.success && (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
    </form>
  );
}

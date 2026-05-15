'use client';

import { useId, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Simple regex matching the server-side Zod email validator's intent. Used
// only to gate the send button; the API is the source of truth.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailHistoryButtonProps {
  patientId: string;
  /** Patient's stored email, used to prefill the recipient field. */
  defaultRecipientEmail: string | null;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export function EmailHistoryButton({
  patientId,
  defaultRecipientEmail,
}: EmailHistoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail ?? '');
  const [authorized, setAuthorized] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const emailId = useId();
  const checkboxId = useId();

  function reset() {
    setRecipient(defaultRecipientEmail ?? '');
    setAuthorized(false);
    setStatus({ kind: 'idle' });
  }

  function closeModal() {
    if (status.kind === 'sending') return;
    setOpen(false);
    reset();
  }

  const recipientValid = EMAIL_RE.test(recipient.trim());
  const canSubmit = recipientValid && authorized && status.kind !== 'sending';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus({ kind: 'sending' });
    try {
      const res = await fetch(`/api/patients/${patientId}/email-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: recipient.trim(),
          confirmed_patient_authorization: true,
        }),
      });
      if (res.ok) {
        setStatus({ kind: 'success' });
        return;
      }
      // Fall back to a generic message if the body is missing/malformed —
      // never surface raw response text to the user.
      let message = 'No se pudo enviar el correo';
      try {
        const data = (await res.json()) as { error?: string };
        if (typeof data.error === 'string' && data.error.length > 0) {
          message = data.error;
        }
      } catch {
        /* ignore */
      }
      setStatus({ kind: 'error', message });
    } catch {
      setStatus({ kind: 'error', message: 'Error de red. Intente nuevamente.' });
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail className="h-3.5 w-3.5" />
        Enviar historial por correo
      </Button>

      {open && (
        <div
          // Full-screen overlay; click outside the panel closes the modal.
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${emailId}-title`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`${emailId}-title`}
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Enviar historial por correo
            </h2>

            {status.kind === 'success' ? (
              <div className="mt-4 space-y-4">
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Historial enviado correctamente.
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={closeModal}>
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : (
              <form className="mt-3 space-y-4" onSubmit={onSubmit}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Este correo incluirá la historia clínica completa del paciente en PDF.
                  Verifique cuidadosamente el destinatario antes de enviar.
                </p>

                <div>
                  <label
                    htmlFor={emailId}
                    className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    Correo del destinatario
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    required
                    autoComplete="off"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={status.kind === 'sending'}
                    placeholder="paciente@correo.com"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="mt-0.5"
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    disabled={status.kind === 'sending'}
                  />
                  <span>
                    Confirmo que el paciente autorizó el envío de su historia clínica por
                    correo electrónico.
                  </span>
                </label>

                {status.kind === 'error' && (
                  <p
                    role="alert"
                    className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  >
                    {status.message}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeModal}
                    disabled={status.kind === 'sending'}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={!canSubmit}>
                    {status.kind === 'sending' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar historial'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

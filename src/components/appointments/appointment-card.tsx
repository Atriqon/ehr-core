'use client';

import Link from 'next/link';
import { useActionState, useTransition } from 'react';
import { Clock, User, FileText, MoreVertical, UserCheck, Stethoscope, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, STATUS_CONFIG } from '@/components/appointments/status-badge';
import { updateAppointmentStatus, cancelAppointment } from '@/actions/appointments';
import type { AppointmentWithDetails } from '@/queries/appointments';
import type { AppointmentStatus } from '@/lib/validators/appointment';
import { VALID_TRANSITIONS } from '@/lib/validators/appointment';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  showDoctor?: boolean;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// Which action buttons to show for each status
const ACTION_BUTTONS: Partial<Record<AppointmentStatus, { label: string; nextStatus: AppointmentStatus; icon: React.ReactNode }[]>> = {
  scheduled:   [{ label: 'Confirmar', nextStatus: 'confirmed', icon: <UserCheck className="h-3.5 w-3.5" /> }],
  confirmed:   [{ label: 'Llegó', nextStatus: 'waiting', icon: <UserCheck className="h-3.5 w-3.5" /> }],
  waiting:     [{ label: 'Iniciar consulta', nextStatus: 'in_progress', icon: <Stethoscope className="h-3.5 w-3.5" /> }],
  in_progress: [{ label: 'Completar', nextStatus: 'completed', icon: <UserCheck className="h-3.5 w-3.5" /> }],
};

export function AppointmentCard({ appointment, showDoctor = false }: AppointmentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [statusState, statusAction] = useActionState(updateAppointmentStatus, null);
  const [cancelState, cancelAction] = useActionState(cancelAppointment, null);
  const [isPending, startTransition] = useTransition();

  const status = appointment.status;
  const isFinal = status === 'completed' || status === 'cancelled' || status === 'no_show';
  const validNext = VALID_TRANSITIONS[status] ?? [];
  const primaryActions = ACTION_BUTTONS[status] ?? [];

  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900',
        status === 'cancelled' || status === 'no_show'
          ? 'border-zinc-100 opacity-70 dark:border-zinc-800'
          : 'border-zinc-200 dark:border-zinc-700',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
          <span>{formatTime(appointment.startTime)}</span>
          {appointment.endTime && (
            <span className="font-normal text-zinc-400">→ {formatTime(appointment.endTime)}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={status} />

          {/* Overflow menu */}
          {!isFinal && (
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Más opciones"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    {validNext.includes('no_show') && (
                      <form action={statusAction}>
                        <input type="hidden" name="appointment_id" value={appointment.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                          onClick={() => setMenuOpen(false)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          No asistió
                        </button>
                      </form>
                    )}
                    {validNext.includes('cancelled') && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => {
                          setMenuOpen(false);
                          setShowCancelForm(true);
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar cita
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Patient */}
      <div className="mt-2 flex items-center gap-1.5 text-sm">
        <User className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        <Link
          href={`/pacientes/${appointment.patientId}`}
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {patientName}
        </Link>
      </div>

      {/* Doctor (optional) */}
      {showDoctor && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Stethoscope className="h-3.5 w-3.5 shrink-0" />
          {appointment.doctor.fullName}
        </div>
      )}

      {/* Reason */}
      {appointment.reason && (
        <div className="mt-1 flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{appointment.reason}</span>
        </div>
      )}

      {/* Error feedback */}
      {(statusState && !statusState.success) && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{statusState.error}</p>
      )}
      {(cancelState && !cancelState.success) && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{cancelState.error}</p>
      )}

      {/* Primary action buttons */}
      {primaryActions.length > 0 && (
        <div className="mt-3 flex gap-2">
          {primaryActions.map((action) => (
            <form key={action.nextStatus} action={statusAction}>
              <input type="hidden" name="appointment_id" value={appointment.id} />
              <input type="hidden" name="status" value={action.nextStatus} />
              <Button type="submit" variant="outline" size="sm" disabled={isPending}>
                {action.icon}
                {action.label}
              </Button>
            </form>
          ))}
        </div>
      )}

      {/* Cancel form */}
      {showCancelForm && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="mb-2 text-sm font-medium text-red-700 dark:text-red-400">
            ¿Cancelar esta cita?
          </p>
          <form action={cancelAction}>
            <input type="hidden" name="appointment_id" value={appointment.id} />
            <textarea
              name="reason"
              placeholder="Motivo (opcional)"
              rows={2}
              className="w-full rounded-md border border-red-200 bg-white p-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-400 dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <div className="mt-2 flex gap-2">
              <Button type="submit" variant="destructive" size="sm">
                Confirmar cancelación
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelForm(false)}
              >
                Volver
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

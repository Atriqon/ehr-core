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
        'group relative rounded-[18px] p-4 transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5',
        'glass-surface',
        (status === 'cancelled' || status === 'no_show') && 'opacity-70',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.005em] text-slate-900">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{formatTime(appointment.startTime)}</span>
          {appointment.endTime && (
            <span className="font-normal text-slate-400">→ {formatTime(appointment.endTime)}</span>
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
                  <div className="absolute right-0 top-8 z-20 min-w-40 rounded-2xl border border-white/60 bg-white/90 py-1 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.25)] backdrop-blur-2xl">
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
      <div className="mt-2.5 flex items-center gap-1.5 text-[13.5px]">
        <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <Link
          href={`/pacientes/${appointment.patientId}`}
          className="font-semibold text-teal-700 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {patientName}
        </Link>
      </div>

      {/* Doctor (optional) */}
      {showDoctor && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <Stethoscope className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {appointment.doctor.fullName}
        </div>
      )}

      {/* Reason */}
      {appointment.reason && (
        <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="line-clamp-2">{appointment.reason}</span>
        </div>
      )}

      {/* Error feedback */}
      {(statusState && !statusState.success) && (
        <p className="mt-2 text-xs text-red-600">{statusState.error}</p>
      )}
      {(cancelState && !cancelState.success) && (
        <p className="mt-2 text-xs text-red-600">{cancelState.error}</p>
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
        <div className="mt-3 rounded-2xl border border-red-600/20 bg-red-100/70 p-3.5 backdrop-blur-md">
          <p className="mb-2 text-sm font-semibold text-red-700">
            ¿Cancelar esta cita?
          </p>
          <form action={cancelAction}>
            <input type="hidden" name="appointment_id" value={appointment.id} />
            <textarea
              name="reason"
              placeholder="Motivo (opcional)"
              rows={2}
              className="w-full rounded-xl border border-red-600/20 bg-white/85 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/40"
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

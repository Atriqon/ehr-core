import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import type { AppointmentWithDetails } from '@/queries/appointments';

interface DailyViewProps {
  appointments: AppointmentWithDetails[];
  date: Date;
  showDoctor?: boolean;
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function DailyView({ appointments, date, showDoctor = false }: DailyViewProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <Calendar className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Sin citas para este día
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          {formatDateHeader(date)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium capitalize text-zinc-500 dark:text-zinc-400">
        {formatDateHeader(date)} · {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
      </p>
      {appointments.map((appt) => (
        <AppointmentCard key={appt.id} appointment={appt} showDoctor={showDoctor} />
      ))}
    </div>
  );
}

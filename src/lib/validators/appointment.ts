import { z } from 'zod';

export const appointmentCreateSchema = z.object({
  patient_id: z.string().uuid('ID de paciente inválido'),
  doctor_id: z.string().uuid('ID de médico inválido'),
  // Calendar date as YYYY-MM-DD. We deliberately do NOT coerce to a JS Date
  // here because `z.coerce.date()` would call `new Date('2026-04-18')` which
  // interprets the string as UTC midnight. On a non-UTC server, reading
  // `getDate()` later would then return a different day, causing the stored
  // appointment date to silently shift by one. Keep it as a string and let
  // the action insert it directly into the Postgres `date` column.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD)'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido').optional().or(z.literal('')),
  reason: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const appointmentStatusUpdateSchema = z.object({
  appointment_id: z.string().uuid(),
  status: z.enum(['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show']),
});

export const appointmentCancelSchema = z.object({
  appointment_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AppointmentStatusUpdateInput = z.infer<typeof appointmentStatusUpdateSchema>;
export type AppointmentCancelInput = z.infer<typeof appointmentCancelSchema>;

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// Valid status transitions per PRD section 4
// scheduled → confirmed → waiting → in_progress → completed
// Any → cancelled | no_show
export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled:   ['confirmed', 'cancelled', 'no_show'],
  confirmed:   ['waiting', 'cancelled', 'no_show'],
  waiting:     ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled', 'no_show'],
  completed:   [],
  cancelled:   [],
  no_show:     [],
};

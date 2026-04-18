import { and, asc, between, eq, gte, inArray, lte, ne, not, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appointments, patients, users } from '@/lib/db/schema';
import type { AppointmentStatus } from '@/lib/validators/appointment';
import { toDateStr } from '@/lib/dates';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppointmentWithDetails {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    idNumber: string;
  };
  doctor: {
    id: string;
    fullName: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convert a "HH:MM" string into the number of minutes since midnight. Used
// for time arithmetic and overlap checks. We compare times numerically (not
// lexicographically on the original strings) to remain correct even if the
// upstream validator's zero-padding contract ever changes.
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Add N minutes to a HH:MM string, returns HH:MM
function addMinutes(time: string, minutes: number): string {
  const total = toMinutes(time) + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAppointmentsByDate(
  clinicId: string,
  date: Date,
  doctorId?: string,
): Promise<AppointmentWithDetails[]> {
  const dateStr = toDateStr(date);

  const rows = await db
    .select({
      id: appointments.id,
      clinicId: appointments.clinicId,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      cancelledAt: appointments.cancelledAt,
      patientId2: patients.id,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      patientIdNumber: patients.idNumber,
      doctorId2: users.id,
      doctorFullName: users.fullName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.date, dateStr),
        doctorId ? eq(appointments.doctorId, doctorId) : undefined,
      ),
    )
    .orderBy(asc(appointments.startTime));

  return rows.map((r) => ({
    id: r.id,
    clinicId: r.clinicId,
    patientId: r.patientId,
    doctorId: r.doctorId,
    date: r.date as string,
    startTime: r.startTime as string,
    endTime: r.endTime as string | null,
    status: r.status as AppointmentStatus,
    reason: r.reason,
    notes: r.notes,
    createdAt: r.createdAt,
    cancelledAt: r.cancelledAt,
    patient: {
      id: r.patientId2,
      firstName: r.patientFirstName,
      lastName: r.patientLastName,
      phone: r.patientPhone,
      idNumber: r.patientIdNumber,
    },
    doctor: {
      id: r.doctorId2,
      fullName: r.doctorFullName,
    },
  }));
}

export async function getAppointmentsByWeek(
  clinicId: string,
  weekStartDate: Date,
  doctorId?: string,
): Promise<AppointmentWithDetails[]> {
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startStr = toDateStr(weekStartDate);
  const endStr = toDateStr(weekEnd);

  const rows = await db
    .select({
      id: appointments.id,
      clinicId: appointments.clinicId,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      cancelledAt: appointments.cancelledAt,
      patientId2: patients.id,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      patientIdNumber: patients.idNumber,
      doctorId2: users.id,
      doctorFullName: users.fullName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        between(appointments.date, startStr, endStr),
        doctorId ? eq(appointments.doctorId, doctorId) : undefined,
      ),
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime));

  return rows.map((r) => ({
    id: r.id,
    clinicId: r.clinicId,
    patientId: r.patientId,
    doctorId: r.doctorId,
    date: r.date as string,
    startTime: r.startTime as string,
    endTime: r.endTime as string | null,
    status: r.status as AppointmentStatus,
    reason: r.reason,
    notes: r.notes,
    createdAt: r.createdAt,
    cancelledAt: r.cancelledAt,
    patient: {
      id: r.patientId2,
      firstName: r.patientFirstName,
      lastName: r.patientLastName,
      phone: r.patientPhone,
      idNumber: r.patientIdNumber,
    },
    doctor: {
      id: r.doctorId2,
      fullName: r.doctorFullName,
    },
  }));
}

export async function getAppointmentsByPatient(
  clinicId: string,
  patientId: string,
): Promise<AppointmentWithDetails[]> {
  const rows = await db
    .select({
      id: appointments.id,
      clinicId: appointments.clinicId,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      cancelledAt: appointments.cancelledAt,
      patientId2: patients.id,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      patientIdNumber: patients.idNumber,
      doctorId2: users.id,
      doctorFullName: users.fullName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.patientId, patientId),
      ),
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime));

  return rows.map((r) => ({
    id: r.id,
    clinicId: r.clinicId,
    patientId: r.patientId,
    doctorId: r.doctorId,
    date: r.date as string,
    startTime: r.startTime as string,
    endTime: r.endTime as string | null,
    status: r.status as AppointmentStatus,
    reason: r.reason,
    notes: r.notes,
    createdAt: r.createdAt,
    cancelledAt: r.cancelledAt,
    patient: {
      id: r.patientId2,
      firstName: r.patientFirstName,
      lastName: r.patientLastName,
      phone: r.patientPhone,
      idNumber: r.patientIdNumber,
    },
    doctor: {
      id: r.doctorId2,
      fullName: r.doctorFullName,
    },
  }));
}

// Drizzle's transaction handle implements the same query surface as `db`,
// minus the connection pool (`$client`). We accept either so callers can
// run the check inside an outer transaction (e.g. to combine it with an
// INSERT under an advisory lock and avoid the check-then-insert race).
type DbExecutor = Omit<typeof db, '$client'>;

export async function checkOverlap(
  clinicId: string,
  doctorId: string,
  date: string, // YYYY-MM-DD; the `date` Postgres column is a string anyway
  startTime: string,
  endTime?: string,
  excludeAppointmentId?: string,
  executor: DbExecutor = db,
): Promise<boolean> {
  const effectiveEndTime = endTime || addMinutes(startTime, 30);
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(effectiveEndTime);

  // Active statuses (not cancelled or no_show)
  const activeStatuses: AppointmentStatus[] = ['scheduled', 'confirmed', 'waiting', 'in_progress', 'completed'];

  const existing = await executor
    .select({
      id: appointments.id,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.doctorId, doctorId),
        eq(appointments.date, date),
        inArray(appointments.status, activeStatuses),
        excludeAppointmentId ? ne(appointments.id, excludeAppointmentId) : undefined,
      ),
    );

  for (const appt of existing) {
    const apptStartStr = appt.startTime as string;
    const apptEndStr = (appt.endTime as string | null) ?? addMinutes(apptStartStr, 30);
    const apptStart = toMinutes(apptStartStr);
    const apptEnd = toMinutes(apptEndStr);

    // Overlap: new.start < existing.end AND new.end > existing.start
    if (newStart < apptEnd && newEnd > apptStart) {
      return true;
    }
  }

  return false;
}

export async function getAppointmentById(
  clinicId: string,
  appointmentId: string,
): Promise<AppointmentWithDetails | null> {
  const rows = await db
    .select({
      id: appointments.id,
      clinicId: appointments.clinicId,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      cancelledAt: appointments.cancelledAt,
      patientId2: patients.id,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientPhone: patients.phone,
      patientIdNumber: patients.idNumber,
      doctorId2: users.id,
      doctorFullName: users.fullName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.id, appointmentId),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: r.id,
    clinicId: r.clinicId,
    patientId: r.patientId,
    doctorId: r.doctorId,
    date: r.date as string,
    startTime: r.startTime as string,
    endTime: r.endTime as string | null,
    status: r.status as AppointmentStatus,
    reason: r.reason,
    notes: r.notes,
    createdAt: r.createdAt,
    cancelledAt: r.cancelledAt,
    patient: {
      id: r.patientId2,
      firstName: r.patientFirstName,
      lastName: r.patientLastName,
      phone: r.patientPhone,
      idNumber: r.patientIdNumber,
    },
    doctor: {
      id: r.doctorId2,
      fullName: r.doctorFullName,
    },
  };
}

export async function getDoctorsForClinic(clinicId: string) {
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(
      and(
        eq(users.clinicId, clinicId),
        eq(users.role, 'doctor'),
        eq(users.isActive, true),
      ),
    )
    .orderBy(asc(users.fullName));
}

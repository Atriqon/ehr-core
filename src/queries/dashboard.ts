import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appointments, clinicalNotes, patients } from '@/lib/db/schema';
import { todayInTz } from '@/lib/dates';
import type { AppointmentStatus } from '@/lib/validators/appointment';

export interface DashboardStats {
  activePatients: number;
  todayTotal: number;
  todayByStatus: Partial<Record<AppointmentStatus, number>>;
  monthlyConsultations: number;
  newPatientsThisMonth: number;
}

export async function getDashboardStats(
  clinicId: string,
  timezone: string,
): Promise<DashboardStats> {
  const today = todayInTz(timezone);
  const [year, month] = today.split('-');
  const firstOfMonth = `${year}-${month}-01`;
  const [y, mo] = firstOfMonth.split('-').map(Number);
  // Midnight UTC on the first of the month — close enough for a dashboard counter.
  const firstOfMonthDate = new Date(Date.UTC(y, mo - 1, 1));

  const [activePatientsRows, todayApptRows, monthlyNotesRows, newPatientsRows] =
    await Promise.all([
      db
        .select({ cnt: sql<string>`count(*)` })
        .from(patients)
        .where(and(eq(patients.clinicId, clinicId), eq(patients.isActive, true))),

      db
        .select({ status: appointments.status, cnt: sql<string>`count(*)` })
        .from(appointments)
        .where(and(eq(appointments.clinicId, clinicId), eq(appointments.date, today)))
        .groupBy(appointments.status),

      db
        .select({ cnt: sql<string>`count(*)` })
        .from(clinicalNotes)
        .innerJoin(patients, eq(clinicalNotes.patientId, patients.id))
        .where(
          and(
            eq(patients.clinicId, clinicId),
            gte(clinicalNotes.noteDate, firstOfMonth),
          ),
        ),

      db
        .select({ cnt: sql<string>`count(*)` })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            gte(patients.createdAt, firstOfMonthDate),
          ),
        ),
    ]);

  const todayByStatus: Partial<Record<AppointmentStatus, number>> = {};
  let todayTotal = 0;
  for (const row of todayApptRows) {
    const n = Number(row.cnt);
    todayByStatus[row.status as AppointmentStatus] = n;
    todayTotal += n;
  }

  return {
    activePatients: Number(activePatientsRows[0]?.cnt ?? 0),
    todayTotal,
    todayByStatus,
    monthlyConsultations: Number(monthlyNotesRows[0]?.cnt ?? 0),
    newPatientsThisMonth: Number(newPatientsRows[0]?.cnt ?? 0),
  };
}

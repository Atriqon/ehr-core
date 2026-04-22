import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clinics } from '@/lib/db/schema';

export interface ClinicSummary {
  id: string;
  name: string;
  timezone: string;
  weekStartsOn: 0 | 1;
}

export interface ClinicSettings {
  /** IANA timezone, e.g. "America/Caracas" or "Europe/Madrid". */
  timezone: string;
  /** First day of the week: 0 = Sunday (US), 1 = Monday (Europe / ISO 8601). */
  weekStartsOn: 0 | 1;
}

const DEFAULT_SETTINGS: ClinicSettings = {
  timezone: 'America/Caracas',
  weekStartsOn: 1,
};

function normalizeWeekStartsOn(value: number | null | undefined): 0 | 1 {
  return value === 0 ? 0 : 1;
}

export async function getClinic(clinicId: string): Promise<ClinicSummary | null> {
  const rows = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      timezone: clinics.timezone,
      weekStartsOn: clinics.weekStartsOn,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    weekStartsOn: normalizeWeekStartsOn(row.weekStartsOn),
  };
}

/**
 * Returns the per-clinic locale-affecting settings. All server-side date
 * arithmetic ("today", week boundaries, etc.) MUST use these instead of the
 * server's local clock so the app behaves consistently regardless of where
 * it is hosted.
 */
export interface FullClinic {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  weekStartsOn: 0 | 1;
}

export async function getFullClinic(clinicId: string): Promise<FullClinic | null> {
  const rows = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      address: clinics.address,
      phone: clinics.phone,
      timezone: clinics.timezone,
      weekStartsOn: clinics.weekStartsOn,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    timezone: row.timezone,
    weekStartsOn: normalizeWeekStartsOn(row.weekStartsOn),
  };
}

export async function getClinicSettings(clinicId: string): Promise<ClinicSettings> {
  const rows = await db
    .select({
      timezone: clinics.timezone,
      weekStartsOn: clinics.weekStartsOn,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);
  const row = rows[0];
  if (!row) return DEFAULT_SETTINGS;
  return {
    timezone: row.timezone,
    weekStartsOn: normalizeWeekStartsOn(row.weekStartsOn),
  };
}

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clinics, type SubscriptionStatus, type SubscriptionPlan } from '@/lib/db/schema';

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

export interface ClinicSubscription {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  daysRemaining: number;
  isTrialExpired: boolean;
  plan: SubscriptionPlan | null;
  maxPatients: number;
  maxDoctors: number;
  maxStorageMb: number;
}

export async function getClinicSubscription(clinicId: string): Promise<ClinicSubscription> {
  const rows = await db
    .select({
      subscriptionStatus: clinics.subscriptionStatus,
      trialEndsAt: clinics.trialEndsAt,
      subscriptionPlan: clinics.subscriptionPlan,
      maxPatients: clinics.maxPatients,
      maxDoctors: clinics.maxDoctors,
      maxStorageMb: clinics.maxStorageMb,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return {
      status: 'active',
      trialEndsAt: null,
      daysRemaining: 0,
      isTrialExpired: false,
      plan: null,
      maxPatients: 500,
      maxDoctors: 1,
      maxStorageMb: 1024,
    };
  }

  const now = Date.now();
  const trialEndsAt = row.trialEndsAt ?? null;
  const isTrialing = row.subscriptionStatus === 'trialing';
  const isTrialExpired = isTrialing && trialEndsAt !== null && trialEndsAt.getTime() < now;
  const daysRemaining =
    isTrialing && trialEndsAt !== null
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / (1000 * 60 * 60 * 24)))
      : 0;

  return {
    status: row.subscriptionStatus,
    trialEndsAt,
    daysRemaining,
    isTrialExpired,
    plan: row.subscriptionPlan ?? null,
    maxPatients: row.maxPatients,
    maxDoctors: row.maxDoctors,
    maxStorageMb: row.maxStorageMb,
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

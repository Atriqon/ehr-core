import type { UserRole } from '@/lib/db/schema';

/**
 * Roles allowed into the clinic reports dashboard.
 *
 * Admins get the full dashboard; doctors see the same clinic-wide clinical
 * stats (consistent with existing product rules — `getMedicalHistory` already
 * lets doctors read the whole clinic's clinical data). Receptionists are
 * blocked: there are currently no receptionist-safe report metrics.
 */
export const REPORTS_ALLOWED_ROLES: UserRole[] = ['admin', 'doctor'];

export function canAccessReports(role: UserRole | null | undefined): boolean {
  return role != null && REPORTS_ALLOWED_ROLES.includes(role);
}

/**
 * Admins and doctor-owners may filter the dashboard by an individual doctor.
 * Receptionists cannot reach reports at all (see `canAccessReports`).
 */
export function canFilterByDoctor(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'doctor';
}

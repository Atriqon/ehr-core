'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { clinics } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/session';
import { auditLog, getClientIpFromHeaders } from '@/lib/audit';
import { clinicSettingsSchema } from '@/lib/validators/user';

export type ClinicActionState =
  | null
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export async function updateClinicSettings(
  _prevState: ClinicActionState,
  formData: FormData,
): Promise<ClinicActionState> {
  let session;
  try {
    session = await requireRole(['admin']);
  } catch {
    return { success: false, error: 'Solo administradores pueden modificar la configuración' };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = clinicSettingsSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisa los datos del formulario',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, address, phone, timezone, week_starts_on } = parsed.data;

  await db
    .update(clinics)
    .set({
      name,
      address: address ?? null,
      phone: phone ?? null,
      timezone,
      weekStartsOn: week_starts_on ?? 1,
      updatedAt: new Date(),
    })
    .where(eq(clinics.id, session.clinicId));

  await auditLog({
    clinicId: session.clinicId,
    userId: session.userId,
    action: 'UPDATE',
    resourceType: 'clinic',
    resourceId: session.clinicId,
    details: { timezone, weekStartsOn: week_starts_on },
    ipAddress: await getClientIpFromHeaders(),
  });

  revalidatePath('/configuracion');
  return { success: true };
}

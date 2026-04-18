'use server';

import { getSession } from '@/lib/auth/session';
import { getPatients } from '@/queries/patients';

export interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string | null;
}

export async function searchPatients(query: string): Promise<PatientSearchResult[]> {
  const session = await getSession();
  if (!session) return [];

  const page = await getPatients(session.clinicId, { search: query, limit: 8 });
  return page.items.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    idNumber: p.idNumber,
    phone: p.phone,
  }));
}

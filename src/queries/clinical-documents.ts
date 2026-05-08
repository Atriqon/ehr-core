import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clinicalDocuments, patients, users } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/session';
import type {
  ClinicalDocumentContent,
  ClinicalDocumentType,
} from '@/lib/validators/clinical-document';

// Generated documents are part of the clinical record. Per PRD-style permissions
// added in this module: doctor creates, admin reads, receptionist denied. The
// role gate lives inside these queries so no caller can bypass it.
const VIEWER_ROLES = ['admin', 'doctor'] as const;

export interface ClinicalDocumentListItem {
  id: string;
  patientId: string;
  clinicalNoteId: string | null;
  documentType: ClinicalDocumentType;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    fullName: string;
  };
}

export interface ClinicalDocumentDetail extends ClinicalDocumentListItem {
  content: ClinicalDocumentContent;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    idNumber: string;
    idType: string;
    dateOfBirth: string;
    sex: string;
    phone: string | null;
    address: string | null;
  };
}

export async function getClinicalDocumentsByPatient(
  clinicId: string,
  patientId: string,
): Promise<ClinicalDocumentListItem[]> {
  const session = await requireRole([...VIEWER_ROLES]);
  if (session.clinicId !== clinicId) {
    throw new Error('Sin permisos');
  }

  const rows = await db
    .select({
      id: clinicalDocuments.id,
      patientId: clinicalDocuments.patientId,
      clinicalNoteId: clinicalDocuments.clinicalNoteId,
      documentType: clinicalDocuments.documentType,
      title: clinicalDocuments.title,
      createdAt: clinicalDocuments.createdAt,
      updatedAt: clinicalDocuments.updatedAt,
      authorId: users.id,
      authorFullName: users.fullName,
    })
    .from(clinicalDocuments)
    .innerJoin(users, eq(clinicalDocuments.authorId, users.id))
    .where(
      and(
        eq(clinicalDocuments.patientId, patientId),
        eq(clinicalDocuments.clinicId, clinicId),
      ),
    )
    .orderBy(desc(clinicalDocuments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    clinicalNoteId: r.clinicalNoteId,
    documentType: r.documentType as ClinicalDocumentType,
    title: r.title,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: { id: r.authorId, fullName: r.authorFullName },
  }));
}

export async function getClinicalDocumentById(
  clinicId: string,
  documentId: string,
): Promise<ClinicalDocumentDetail | null> {
  const session = await requireRole([...VIEWER_ROLES]);
  if (session.clinicId !== clinicId) {
    throw new Error('Sin permisos');
  }

  const rows = await db
    .select({
      id: clinicalDocuments.id,
      patientId: clinicalDocuments.patientId,
      clinicalNoteId: clinicalDocuments.clinicalNoteId,
      documentType: clinicalDocuments.documentType,
      title: clinicalDocuments.title,
      content: clinicalDocuments.content,
      createdAt: clinicalDocuments.createdAt,
      updatedAt: clinicalDocuments.updatedAt,
      authorId: users.id,
      authorFullName: users.fullName,
      patientId2: patients.id,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientIdNumber: patients.idNumber,
      patientIdType: patients.idType,
      patientDob: patients.dateOfBirth,
      patientSex: patients.sex,
      patientPhone: patients.phone,
      patientAddress: patients.address,
    })
    .from(clinicalDocuments)
    .innerJoin(users, eq(clinicalDocuments.authorId, users.id))
    .innerJoin(patients, eq(clinicalDocuments.patientId, patients.id))
    .where(
      and(
        eq(clinicalDocuments.id, documentId),
        eq(clinicalDocuments.clinicId, clinicId),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: r.id,
    patientId: r.patientId,
    clinicalNoteId: r.clinicalNoteId,
    documentType: r.documentType as ClinicalDocumentType,
    title: r.title,
    content: (r.content ?? {}) as ClinicalDocumentContent,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: { id: r.authorId, fullName: r.authorFullName },
    patient: {
      id: r.patientId2,
      firstName: r.patientFirstName,
      lastName: r.patientLastName,
      idNumber: r.patientIdNumber,
      idType: r.patientIdType as string,
      dateOfBirth: r.patientDob as string,
      sex: r.patientSex as string,
      phone: r.patientPhone,
      address: r.patientAddress,
    },
  };
}

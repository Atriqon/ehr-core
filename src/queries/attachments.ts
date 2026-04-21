import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attachments, patients, users } from '@/lib/db/schema';
import type { AttachmentCategory } from '@/lib/validators/attachment';

export interface AttachmentListItem {
  id: string;
  patientId: string;
  clinicalNoteId: string | null;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: AttachmentCategory | null;
  description: string | null;
  uploadedAt: Date;
  uploader: {
    id: string;
    fullName: string;
  };
}

const SELECT_COLUMNS = {
  id: attachments.id,
  patientId: attachments.patientId,
  clinicalNoteId: attachments.clinicalNoteId,
  uploadedBy: attachments.uploadedBy,
  fileName: attachments.fileName,
  fileType: attachments.fileType,
  fileSizeBytes: attachments.fileSizeBytes,
  category: attachments.category,
  description: attachments.description,
  uploadedAt: attachments.uploadedAt,
  uploaderId: users.id,
  uploaderFullName: users.fullName,
} as const;

type Row = {
  id: string;
  patientId: string;
  clinicalNoteId: string | null;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  category: AttachmentCategory | null;
  description: string | null;
  uploadedAt: Date;
  uploaderId: string;
  uploaderFullName: string;
};

function toListItem(r: Row): AttachmentListItem {
  return {
    id: r.id,
    patientId: r.patientId,
    clinicalNoteId: r.clinicalNoteId,
    uploadedBy: r.uploadedBy,
    fileName: r.fileName,
    fileType: r.fileType,
    fileSizeBytes: r.fileSizeBytes,
    category: r.category,
    description: r.description,
    uploadedAt: r.uploadedAt,
    uploader: { id: r.uploaderId, fullName: r.uploaderFullName },
  };
}

// Clinic-scoped list of attachments for a patient. Joins users to surface
// the uploader name so the list UI doesn't need a second round-trip. Ordered
// newest-first to match how doctors scan the patient file.
export async function getAttachmentsByPatient(
  clinicId: string,
  patientId: string,
): Promise<AttachmentListItem[]> {
  const rows = await db
    .select(SELECT_COLUMNS)
    .from(attachments)
    .innerJoin(patients, eq(attachments.patientId, patients.id))
    .innerJoin(users, eq(attachments.uploadedBy, users.id))
    .where(and(eq(attachments.patientId, patientId), eq(patients.clinicId, clinicId)))
    .orderBy(desc(attachments.uploadedAt));

  return rows.map((r) => toListItem(r as Row));
}

// Clinic-scoped list of attachments tied to a specific clinical note. The
// patients join still gates by `clinicId` so a note id leaked across clinics
// returns zero rows.
export async function getAttachmentsByClinicalNote(
  clinicId: string,
  clinicalNoteId: string,
): Promise<AttachmentListItem[]> {
  const rows = await db
    .select(SELECT_COLUMNS)
    .from(attachments)
    .innerJoin(patients, eq(attachments.patientId, patients.id))
    .innerJoin(users, eq(attachments.uploadedBy, users.id))
    .where(
      and(eq(attachments.clinicalNoteId, clinicalNoteId), eq(patients.clinicId, clinicId)),
    )
    .orderBy(desc(attachments.uploadedAt));

  return rows.map((r) => toListItem(r as Row));
}

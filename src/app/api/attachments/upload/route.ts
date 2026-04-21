import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attachments, clinicalNotes, patients } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { auditLog, getClientIpFromHeaders } from '@/lib/audit';
import { generateId } from '@/lib/utils/generate-id';
import { uploadFile } from '@/lib/storage';
import {
  ALLOWED_ATTACHMENT_MIME,
  MAX_ATTACHMENT_BYTES,
  attachmentUploadMetadataSchema,
} from '@/lib/validators/attachment';

// Cap how large a request body we're willing to buffer. Lets the handler
// reject oversize uploads before pulling the full payload into memory.
export const maxDuration = 60;

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  if (v === null) return undefined;
  const s = typeof v === 'string' ? v : String(v);
  return s === '' ? undefined : s;
}

// File-signature ("magic bytes") check. Browsers derive `file.type` from the
// filename extension, so a `.exe` renamed to `.pdf` can pass the declared-MIME
// whitelist. We re-verify by looking at the first bytes of the buffer so the
// declared type has to match what's actually on disk.
const PDF_SIG = Buffer.from('%PDF-');
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function magicBytesMatch(buffer: Buffer, mime: string): boolean {
  let sig: Buffer;
  switch (mime) {
    case 'application/pdf':
      sig = PDF_SIG;
      break;
    case 'image/jpeg':
    case 'image/jpg':
      sig = JPEG_SIG;
      break;
    case 'image/png':
      sig = PNG_SIG;
      break;
    default:
      return false;
  }
  return buffer.length >= sig.length && buffer.subarray(0, sig.length).equals(sig);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Form data inválido' },
      { status: 400 },
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'Archivo requerido en el campo "file"' },
      { status: 400 },
    );
  }

  const metaRaw = {
    patient_id: (formData.get('patient_id') as string | null) ?? '',
    clinical_note_id: emptyToUndefined(formData.get('clinical_note_id')),
    category: emptyToUndefined(formData.get('category')),
    description: emptyToUndefined(formData.get('description')),
  };

  const metaParsed = attachmentUploadMetadataSchema.safeParse(metaRaw);
  if (!metaParsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Datos del adjunto inválidos',
        fieldErrors: metaParsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const meta = metaParsed.data;

  // Validate size. `file.size` is authoritative for the request; we also
  // verify the actual buffer length below to guard against inconsistent
  // client reporting.
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { success: false, error: 'El archivo excede el tamaño máximo de 10MB' },
      { status: 413 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { success: false, error: 'El archivo está vacío' },
      { status: 400 },
    );
  }

  // Validate MIME type against whitelist (PDF/JPG/PNG only). Browsers fill
  // `file.type` from the extension; we still rely on it as a first-line
  // gate.
  const mime = file.type?.toLowerCase() ?? '';
  const ext = ALLOWED_ATTACHMENT_MIME[mime];
  if (!ext) {
    return NextResponse.json(
      {
        success: false,
        error: 'Tipo de archivo no permitido. Solo PDF, JPG o PNG.',
      },
      { status: 415 },
    );
  }

  // Clinic-scoped patient check. Prevents uploading a file against a patient
  // that belongs to another clinic by tampering with the form fields.
  const patientRow = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, meta.patient_id), eq(patients.clinicId, session.clinicId)))
    .limit(1);
  if (patientRow.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Paciente no encontrado' },
      { status: 404 },
    );
  }

  // If the client linked the upload to a clinical note, that note must belong
  // to the same patient and clinic. Keeps the 1-patient → N-attachments graph
  // consistent even when the upload comes from the note editor.
  if (meta.clinical_note_id) {
    const noteRow = await db
      .select({ id: clinicalNotes.id })
      .from(clinicalNotes)
      .innerJoin(patients, eq(clinicalNotes.patientId, patients.id))
      .where(
        and(
          eq(clinicalNotes.id, meta.clinical_note_id),
          eq(clinicalNotes.patientId, meta.patient_id),
          eq(patients.clinicId, session.clinicId),
        ),
      )
      .limit(1);
    if (noteRow.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nota clínica no encontrada' },
        { status: 404 },
      );
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { success: false, error: 'El archivo excede el tamaño máximo de 10MB' },
      { status: 413 },
    );
  }

  // Content check: the file's magic bytes must match the declared MIME.
  // Catches a spoofed Content-Type on an otherwise-accepted extension.
  if (!magicBytesMatch(buffer, mime)) {
    return NextResponse.json(
      {
        success: false,
        error: 'El contenido del archivo no coincide con el tipo declarado',
      },
      { status: 415 },
    );
  }

  const attachmentId = generateId();
  const storageKey = `${generateId()}.${ext}`;

  try {
    await uploadFile(buffer, storageKey, mime);
  } catch (err) {
    console.error('[attachments] upload to storage failed', err);
    return NextResponse.json(
      { success: false, error: 'No se pudo subir el archivo' },
      { status: 500 },
    );
  }

  // Only use the file name for display; never for the storage key. PRD §1:
  // storage_key is UUID + extension.
  const displayName = file.name || `archivo.${ext}`;

  const [created] = await db
    .insert(attachments)
    .values({
      id: attachmentId,
      patientId: meta.patient_id,
      clinicalNoteId: meta.clinical_note_id ?? null,
      uploadedBy: session.userId,
      fileName: displayName.slice(0, 255),
      storageKey,
      fileType: mime,
      fileSizeBytes: buffer.byteLength,
      category: meta.category ?? 'other',
      description: meta.description ?? null,
    })
    .returning();

  await auditLog({
    clinicId: session.clinicId,
    userId: session.userId,
    action: 'CREATE',
    resourceType: 'attachment',
    resourceId: attachmentId,
    details: {
      patientId: meta.patient_id,
      clinicalNoteId: meta.clinical_note_id ?? null,
      category: created.category,
      fileType: mime,
      fileSizeBytes: buffer.byteLength,
    },
    ipAddress: await getClientIpFromHeaders(),
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

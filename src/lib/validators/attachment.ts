import { z } from 'zod';

// Whitelist of file types we accept for upload. MIME type is what the browser
// sends; extension is what we append to the storage key.
export const ALLOWED_ATTACHMENT_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const attachmentCategoryValues = [
  'lab_result',
  'imaging',
  'consent',
  'prescription',
  'procedure_photo',
  'other',
] as const;

export const attachmentCategorySchema = z.enum(attachmentCategoryValues);

export const attachmentUploadMetadataSchema = z.object({
  patient_id: z.string().uuid('ID de paciente inválido'),
  clinical_note_id: z.string().uuid('ID de nota inválido').optional(),
  category: attachmentCategorySchema.optional(),
  description: z.string().max(500).optional(),
});

export type AttachmentCategory = (typeof attachmentCategoryValues)[number];
export type AttachmentUploadMetadata = z.infer<typeof attachmentUploadMetadataSchema>;

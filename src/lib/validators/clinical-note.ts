import { z } from 'zod';

// ─── Diagnosis entry ──────────────────────────────────────────────────────────

export const diagnosisEntrySchema = z.object({
  code: z.string().max(20).optional(),
  text: z.string().max(500),
});

export type DiagnosisEntry = z.infer<typeof diagnosisEntrySchema>;

// ─── specialty_data (consulta ginecológica) ───────────────────────────────────
// Schema for the JSONB `specialty_data` column on clinical notes. Mirrors
// PRD Técnico §1 plus `height_cm` which we keep here (not in the relational
// columns) so the BMI auto-calc has somewhere to persist its input.

export const bloodPressureRegex = /^\s*\d{2,3}\/\d{2,3}\s*$/;

// ─── Gynecological exam (subsección de specialty_data) ───────────────────────
// Estructura por bloque: cada hallazgo tiene un `value` (select cerrado) y un
// `note` (texto libre). El "otro" opcional permite escribir la opción que no
// estaba en la lista. El schema fija los enums para que el doctor solo pueda
// elegir valores válidos; cualquier matiz se escribe en `note`.

const examFinding = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .object({
      value: z.enum(values).nullable().optional(),
      note: z.string().max(500).nullable().optional(),
    })
    .partial();

export const labiaMajoraValues = ['normal', 'edema', 'lesiones', 'otro'] as const;
export const labiaMinoraValues = ['normal', 'adherencias', 'lesiones', 'otro'] as const;
export const vulvaValues = ['normal', 'leucoplasia', 'condilomas', 'otro'] as const;
export const perinealValues = ['normal', 'desgarros', 'cicatrices', 'otro'] as const;
export const vaginaValues = ['normal', 'leucorrea', 'lesiones', 'otro'] as const;
export const cervixValues = [
  'normal',
  'ectropion',
  'polipo',
  'lesion_sospechosa',
  'otro',
] as const;
export const dischargeValues = [
  'sin_secrecion',
  'blanca',
  'amarilla',
  'verdosa',
  'sanguinolenta',
] as const;
export const uterusSizeValues = ['normal', 'aumentado', 'disminuido'] as const;
export const uterusPositionValues = ['avf', 'rvf', 'lateral'] as const;
export const adnexaValues = ['normal', 'masa_palpable', 'dolor'] as const;
export const douglasValues = ['libre', 'abombado', 'doloroso'] as const;

export const procedureTypeValues = [
  'citologia',
  'cultivo_vaginal',
  'biopsia_cuello',
  'biopsia_vulva',
  'radiocirugia',
  'laser',
  'hifu',
  'exosoma',
  'colocacion_hilos',
  'otro',
] as const;

export type ProcedureType = (typeof procedureTypeValues)[number];

// Per-procedure entry. `photos` references attachment IDs uploaded with
// category='procedure_photo' — the actual file lives in the attachments
// table, this is just the linkage so the view can render before/after pairs
// next to the right procedure.
export const procedureEntrySchema = z.object({
  type: z.enum(procedureTypeValues),
  // Free-text label when type === 'otro'. Ignored otherwise.
  custom_label: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  photos: z
    .object({
      before: z.string().uuid().nullable().optional(),
      after: z.string().uuid().nullable().optional(),
    })
    .partial()
    .optional(),
});

export type ProcedureEntry = z.infer<typeof procedureEntrySchema>;

export const gynecologicalExamSchema = z
  .object({
    // External
    labia_majora: examFinding(labiaMajoraValues).optional(),
    labia_minora: examFinding(labiaMinoraValues).optional(),
    vulva: examFinding(vulvaValues).optional(),
    perineal: examFinding(perinealValues).optional(),
    // Speculum
    vagina: examFinding(vaginaValues).optional(),
    cervix: examFinding(cervixValues).optional(),
    discharge: examFinding(dischargeValues).optional(),
    // Bimanual
    uterus: z
      .object({
        size: z.enum(uterusSizeValues).nullable().optional(),
        position: z.enum(uterusPositionValues).nullable().optional(),
        consistency: z.string().max(200).nullable().optional(),
        mobility: z.string().max(200).nullable().optional(),
        pain: z.string().max(200).nullable().optional(),
      })
      .partial()
      .optional(),
    right_adnexa: examFinding(adnexaValues).optional(),
    left_adnexa: examFinding(adnexaValues).optional(),
    douglas_pouch: examFinding(douglasValues).optional(),
    // Procedures performed during this visit (structured replacement for the
    // free-text `procedure_performed` field — both can coexist).
    procedures: z.array(procedureEntrySchema).max(20).optional(),
  })
  .partial();

export type GynecologicalExam = z.infer<typeof gynecologicalExamSchema>;

export const clinicalNoteSpecialtyDataSchema = z.object({
  blood_pressure: z
    .string()
    .regex(bloodPressureRegex, 'Formato TA inválido (ej: 120/80)')
    .max(20)
    .nullable()
    .optional(),
  weight_kg: z.coerce.number().min(0).max(500).nullable().optional(),
  height_cm: z.coerce.number().min(0).max(250).nullable().optional(),
  bmi: z.coerce.number().min(0).max(200).nullable().optional(),
  last_menstrual_period: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .nullable()
    .optional(),
  gestational_age_weeks: z.coerce.number().min(0).max(45).nullable().optional(),
  ultrasound_findings: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().max(4000).nullable().optional(),
  ),
  follicle_count_left: z.coerce.number().int().min(0).max(100).nullable().optional(),
  follicle_count_right: z.coerce.number().int().min(0).max(100).nullable().optional(),
  endometrial_thickness_mm: z.coerce.number().min(0).max(50).nullable().optional(),
  procedure_performed: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().max(2000).nullable().optional(),
  ),
  treatment_protocol: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().max(2000).nullable().optional(),
  ),
  gynecological_exam: gynecologicalExamSchema.nullable().optional(),
});

export type ClinicalNoteSpecialtyData = z.infer<typeof clinicalNoteSpecialtyDataSchema>;

// ─── Create / Update ──────────────────────────────────────────────────────────
// PRD Técnico §6. The create schema only validates input coming from the
// frontend — server-side we still enforce author/clinic/role rules.

export const clinicalNoteCreateSchema = z.object({
  patient_id: z.string().uuid('ID de paciente inválido'),
  appointment_id: z
    .string()
    .uuid('ID de cita inválido')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  note_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD)'),
  chief_complaint: z.string().max(1000).optional(),
  subjective: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  assessment: z.string().max(5000).optional(),
  plan: z.string().max(5000).optional(),
  diagnoses: z.array(diagnosisEntrySchema).max(10).optional(),
  internal_notes: z.string().max(5000).optional(),
  specialty_data: clinicalNoteSpecialtyDataSchema.optional(),
});

export type ClinicalNoteCreateInput = z.infer<typeof clinicalNoteCreateSchema>;

// Update reuses the same shape but makes every field optional (except the
// note id) so partial saves (e.g. "Guardar borrador" after editing one
// field) don't have to round-trip the entire form.
export const clinicalNoteUpdateSchema = clinicalNoteCreateSchema
  .partial()
  .extend({
    note_id: z.string().uuid('ID de nota inválido'),
  });

export type ClinicalNoteUpdateInput = z.infer<typeof clinicalNoteUpdateSchema>;

export const clinicalNoteSignSchema = z.object({
  note_id: z.string().uuid('ID de nota inválido'),
});

export type ClinicalNoteSignInput = z.infer<typeof clinicalNoteSignSchema>;

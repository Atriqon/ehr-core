-- Add diagnoses JSONB column to replace the two scalar fields.
ALTER TABLE "clinical_notes" ADD COLUMN "diagnoses" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint

-- Migrate existing rows: if either scalar field was filled, convert to a
-- single-element array; otherwise leave as empty array.
UPDATE "clinical_notes"
SET "diagnoses" = CASE
  WHEN "diagnosis_text" IS NOT NULL OR "diagnosis_code" IS NOT NULL
  THEN jsonb_build_array(
    jsonb_strip_nulls(
      jsonb_build_object(
        'code', "diagnosis_code",
        'text', COALESCE("diagnosis_text", '')
      )
    )
  )
  ELSE '[]'::jsonb
END;
--> statement-breakpoint

ALTER TABLE "clinical_notes" DROP COLUMN "diagnosis_text";
--> statement-breakpoint
ALTER TABLE "clinical_notes" DROP COLUMN "diagnosis_code";

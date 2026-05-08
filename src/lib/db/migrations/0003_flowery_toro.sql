CREATE TYPE "public"."clinical_document_type" AS ENUM('medical_rest', 'medical_certificate', 'referral', 'prescription', 'patient_instructions');--> statement-breakpoint
CREATE TABLE "clinical_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinical_note_id" uuid,
	"author_id" uuid NOT NULL,
	"document_type" "clinical_document_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_clinical_note_id_clinical_notes_id_fk" FOREIGN KEY ("clinical_note_id") REFERENCES "public"."clinical_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinical_documents_clinic_patient_idx" ON "clinical_documents" USING btree ("clinic_id","patient_id");--> statement-breakpoint
CREATE INDEX "clinical_documents_patient_created_idx" ON "clinical_documents" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "clinical_documents_clinical_note_idx" ON "clinical_documents" USING btree ("clinical_note_id");
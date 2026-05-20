CREATE TYPE "public"."subscription_plan" AS ENUM('basico', 'profesional', 'clinica');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'trialing' NOT NULL;--> statement-breakpoint
UPDATE "clinics" SET "subscription_status" = 'active';--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "subscription_plan" "subscription_plan";--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "max_patients" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "max_doctors" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "max_storage_mb" integer DEFAULT 1024 NOT NULL;
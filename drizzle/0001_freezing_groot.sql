CREATE TYPE "public"."cash_ledger_type" AS ENUM('manual_in', 'manual_out');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'booking_rescheduled' BEFORE 'shift_assigned';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'booking_reassigned' BEFORE 'shift_assigned';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'site_created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'staff_site_assigned';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'cash_entry_recorded';--> statement-breakpoint
ALTER TYPE "public"."staff_role" ADD VALUE 'superadmin';--> statement-breakpoint
CREATE TABLE "cash_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"type" "cash_ledger_type" NOT NULL,
	"amount_aed" integer NOT NULL,
	"note" text,
	"related_booking_id" text,
	"recorded_by_staff_id" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "site_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_ledger" ADD CONSTRAINT "cash_ledger_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_ledger" ADD CONSTRAINT "cash_ledger_related_booking_id_bookings_id_fk" FOREIGN KEY ("related_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_ledger" ADD CONSTRAINT "cash_ledger_recorded_by_staff_id_staff_id_fk" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;
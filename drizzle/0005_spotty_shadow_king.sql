CREATE TYPE "public"."credit_ledger_type" AS ENUM('purchase', 'consumption', 'expiry', 'freeze', 'unfreeze', 'refund', 'gift', 'corporate_grant');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('push', 'whatsapp');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'credit_purchase_recorded';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'credit_adjustment_recorded';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'program_prescribed';--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"type" "credit_ledger_type" NOT NULL,
	"credits" integer NOT NULL,
	"note" text,
	"related_booking_id" text,
	"recorded_by_staff_id" text,
	"payment_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"template" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"coach_id" text NOT NULL,
	"title" text NOT NULL,
	"moves" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_related_booking_id_bookings_id_fk" FOREIGN KEY ("related_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_recorded_by_staff_id_staff_id_fk" FOREIGN KEY ("recorded_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_coach_id_staff_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;
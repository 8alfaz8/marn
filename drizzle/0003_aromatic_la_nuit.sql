ALTER TYPE "public"."audit_action" ADD VALUE 'member_access_link_created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'member_access_link_revoked';--> statement-breakpoint
CREATE TABLE "member_access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"member_id" text NOT NULL,
	"created_by_staff_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by_staff_id" text,
	CONSTRAINT "member_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "parq_screenings" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"site_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"red_flag" boolean NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_access_tokens" ADD CONSTRAINT "member_access_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_access_tokens" ADD CONSTRAINT "member_access_tokens_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_access_tokens" ADD CONSTRAINT "member_access_tokens_revoked_by_staff_id_staff_id_fk" FOREIGN KEY ("revoked_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parq_screenings" ADD CONSTRAINT "parq_screenings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parq_screenings" ADD CONSTRAINT "parq_screenings_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parq_screenings" ADD CONSTRAINT "parq_screenings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;
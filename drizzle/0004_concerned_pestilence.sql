ALTER TABLE "members" ALTER COLUMN "added_by_staff_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "auth_user_id" text;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_auth_user_id_unique" UNIQUE("auth_user_id");
ALTER TABLE "events" ADD COLUMN "is_cancelled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_modified" boolean DEFAULT false NOT NULL;
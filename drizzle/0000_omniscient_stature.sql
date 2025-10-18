CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" varchar NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" date DEFAULT now() NOT NULL,
	"author_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstname" varchar NOT NULL,
	"lastname" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

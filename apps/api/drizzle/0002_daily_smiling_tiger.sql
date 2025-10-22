CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site" text NOT NULL,
	"base_url" text NOT NULL,
	"pagination" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_base_url_unique" UNIQUE("base_url")
);
--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "recipe_id" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "starting_url" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "pagination_overrides" jsonb;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;
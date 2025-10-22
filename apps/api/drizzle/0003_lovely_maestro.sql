ALTER TABLE "plans" DROP CONSTRAINT "plans_run_id_unique";--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_run_id_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "run_id";
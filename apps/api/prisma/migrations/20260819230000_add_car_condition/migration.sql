-- Add explicit new-car preference (distinct from max mileage).
ALTER TABLE "Request" ADD COLUMN "carCondition" TEXT;

-- Retire legacy open-mileage sentinel.
UPDATE "Request" SET "maxMileage" = NULL WHERE "maxMileage" >= 500000;

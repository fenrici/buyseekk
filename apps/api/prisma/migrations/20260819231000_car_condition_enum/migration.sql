-- Convert free-text carCondition to controlled enum.
CREATE TYPE "CarCondition" AS ENUM ('NEW');

ALTER TABLE "Request"
  ALTER COLUMN "carCondition" TYPE "CarCondition"
  USING (
    CASE
      WHEN "carCondition"::text = 'NUEVO' THEN 'NEW'::"CarCondition"
      WHEN "carCondition"::text = 'NEW' THEN 'NEW'::"CarCondition"
      ELSE NULL
    END
  );

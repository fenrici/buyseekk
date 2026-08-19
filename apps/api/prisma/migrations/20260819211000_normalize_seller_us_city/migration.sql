-- Idempotent fix: split city when state was backfilled but city still embeds ", ST"
UPDATE "User"
SET "city" = TRIM(SPLIT_PART("city", ',', 1))
WHERE "country" = 'US'
  AND "city" ~ '^[^,]+, [A-Z]{2}$'
  AND "state" IS NOT NULL
  AND TRIM("state") <> ''
  AND TRIM(SPLIT_PART("city", ',', 2)) = TRIM("state");

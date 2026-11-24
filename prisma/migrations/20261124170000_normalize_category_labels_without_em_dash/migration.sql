-- Normalise existing Marketplace category labels to remove em dash punctuation.
-- This migration is idempotent and preserves the category meaning.
UPDATE "Category"
SET "name" = replace("name", ' — ', ': ')
WHERE "name" LIKE '% — %';

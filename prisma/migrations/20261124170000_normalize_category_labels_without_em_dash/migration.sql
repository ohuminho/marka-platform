-- Normalise existing Marketplace category labels to remove em dash punctuation.
-- This migration is idempotent and preserves the category meaning.
UPDATE "Category"
SET "name" = replace("name", U&'\0020\2014\0020', ': ')
WHERE position(U&'\2014' in "name") > 0;

-- Minimal Supabase Storage bucket catalog required by existing migrations.
-- This is only a CI test fixture; it does not emulate or connect to Storage APIs.
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public BOOLEAN NOT NULL DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[]
);

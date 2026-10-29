-- Private storage for MARKA KYC/KYD/KYB evidence.
-- Never expose identity documents through a public bucket.
-- Access is intentionally restricted by Storage RLS; only trusted server-side
-- service-role operations should read/write these objects until per-user
-- authorization policies are implemented and reviewed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marka-kyc-evidence',
  'marka-kyc-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

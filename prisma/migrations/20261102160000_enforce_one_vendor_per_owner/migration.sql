-- One seller profile per MARKA account. Duplicate audit returned zero rows.
ALTER TABLE public."Vendor"
  ADD CONSTRAINT "Vendor_ownerId_key" UNIQUE ("ownerId");

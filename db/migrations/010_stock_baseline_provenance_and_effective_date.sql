ALTER TABLE public.stock_baselines
  ADD COLUMN verification_method text NOT NULL DEFAULT 'source_reconciled'
    CHECK (verification_method IN ('source_reconciled', 'owner_attested')),
  ADD COLUMN effective_at timestamptz;

COMMENT ON COLUMN public.stock_baselines.verification_method IS
  'Distinguishes a source-reconciled snapshot from an owner-attested stock quantity; owner-attested is not a physical count.';
COMMENT ON COLUMN public.stock_baselines.effective_at IS
  'Business-effective timestamp of the protected opening stock snapshot.';

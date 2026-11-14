ALTER TABLE public.stock_baselines
  ADD COLUMN verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified')),
  ADD COLUMN verification_sha256 text,
  ADD COLUMN verified_at timestamptz;

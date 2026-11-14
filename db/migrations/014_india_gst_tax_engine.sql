-- Effective-dated tax configuration and immutable per-sale tax decision snapshot.
-- This migration does not seed or rewrite business settings, invoices, or history.
ALTER TABLE public.sales
  ADD COLUMN tax_snapshot jsonb,
  ADD CONSTRAINT sales_tax_snapshot_object_check
    CHECK (tax_snapshot IS NULL OR jsonb_typeof(tax_snapshot) = 'object');

CREATE TABLE public.company_tax_configurations (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE RESTRICT,
  configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  approval_status text NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'approved')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  approved_at timestamptz,
  approved_by text REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (approval_status = 'draft' AND approved_at IS NULL AND approved_by IS NULL)
    OR (approval_status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
  )
);

CREATE INDEX company_tax_configurations_status_idx
  ON public.company_tax_configurations(approval_status, updated_at);

COMMENT ON TABLE public.company_tax_configurations IS
  'Company-scoped, effective-dated GST configuration. Draft until owner registration evidence and accountant-reviewed tax/export policy are recorded.';
COMMENT ON COLUMN public.sales.tax_snapshot IS
  'Immutable-at-issue tax determination snapshot for new sales. Existing and historical rows remain NULL; reads never recalculate them.';

-- Domestic supplier master fields. Existing source_record JSONB remains intact.
-- New typed columns stay nullable so this schema change does not invent or
-- rewrite values for any supplier rows that may already exist.
ALTER TABLE public.suppliers
  ADD COLUMN contact_person text,
  ADD COLUMN mobile text,
  ADD COLUMN email text,
  ADD COLUMN gst text,
  ADD COLUMN pan text,
  ADD COLUMN address text,
  ADD COLUMN city text,
  ADD COLUMN state text,
  ADD COLUMN country text,
  ADD COLUMN pin_code text,
  ADD COLUMN opening_balance numeric,
  ADD COLUMN credit_limit numeric,
  ADD COLUMN status text;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_status_check
  CHECK (status IS NULL OR status IN ('Active', 'Inactive'));

CREATE UNIQUE INDEX suppliers_company_code_uidx
  ON public.suppliers(company_id, code);

DROP INDEX public.suppliers_company_code_idx;

-- Domestic customer contract. Export customers remain a separate future module.
-- The importer stores each original source object in source_record and maps the
-- known Customer fields to typed columns without changing the source values.
ALTER TABLE public.customers
  ADD COLUMN contact_person text NOT NULL,
  ADD COLUMN mobile text NOT NULL,
  ADD COLUMN email text NOT NULL,
  ADD COLUMN gst text NOT NULL,
  ADD COLUMN pan text NOT NULL,
  ADD COLUMN address text NOT NULL,
  ADD COLUMN city text NOT NULL,
  ADD COLUMN state text NOT NULL,
  ADD COLUMN country text NOT NULL,
  ADD COLUMN pin_code text NOT NULL,
  ADD COLUMN opening_balance numeric NOT NULL,
  ADD COLUMN credit_limit numeric NOT NULL,
  ADD COLUMN status text NOT NULL CHECK (status IN ('Active', 'Inactive')),
  ADD COLUMN whatsapp text,
  ADD COLUMN payment_terms text,
  ADD COLUMN remarks text;

CREATE UNIQUE INDEX customers_company_code_uidx
  ON public.customers(company_id, code);

DROP INDEX public.customers_company_code_idx;

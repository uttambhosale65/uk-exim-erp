-- Add entry timestamps without backfilling existing master records.
-- Legacy rows remain NULL and sort after newly created rows; no business values change.
ALTER TABLE public.products ADD COLUMN created_at timestamptz;
ALTER TABLE public.products ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.customers ADD COLUMN created_at timestamptz;
ALTER TABLE public.customers ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.suppliers ADD COLUMN created_at timestamptz;
ALTER TABLE public.suppliers ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX products_company_created_idx ON public.products(company_id, created_at DESC);
CREATE INDEX customers_company_created_idx ON public.customers(company_id, created_at DESC);
CREATE INDEX suppliers_company_created_idx ON public.suppliers(company_id, created_at DESC);

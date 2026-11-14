ALTER TABLE public.purchases
  ADD COLUMN historical_imported boolean NOT NULL DEFAULT false;

ALTER TABLE public.sales
  ADD COLUMN historical_imported boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.purchases.historical_imported IS
  'True for immutable legacy history imported without a new stock posting event.';
COMMENT ON COLUMN public.sales.historical_imported IS
  'True for immutable legacy history imported without a new stock posting event.';

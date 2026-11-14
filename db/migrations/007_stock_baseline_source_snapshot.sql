ALTER TABLE public.stock_baselines ADD COLUMN source_record jsonb;
CREATE UNIQUE INDEX stock_baselines_company_product_uidx
  ON public.stock_baselines(company_id, product_code);

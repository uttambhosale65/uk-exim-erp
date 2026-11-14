-- Additive purchase/sales lifecycle support. Existing transaction rows and
-- immutable stock_baselines are left untouched.
ALTER TABLE public.purchases ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.sales ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.purchase_items ADD COLUMN line_id text;
ALTER TABLE public.sales_items ADD COLUMN line_id text;
CREATE UNIQUE INDEX purchase_items_line_uidx ON public.purchase_items(purchase_id, line_id) WHERE line_id IS NOT NULL;
CREATE UNIQUE INDEX sales_items_line_uidx ON public.sales_items(sales_id, line_id) WHERE line_id IS NOT NULL;

CREATE TABLE public.stock_movement_events (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'sale')),
  transaction_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  event_type text NOT NULL CHECK (event_type IN ('post', 'reverse')),
  line_id text NOT NULL,
  product_code text NOT NULL,
  stock_code text NOT NULL,
  quantity_delta_kg numeric NOT NULL CHECK (quantity_delta_kg <> 0),
  source_quantity numeric NOT NULL CHECK (source_quantity > 0),
  unit text NOT NULL,
  net_weight_grams numeric NOT NULL CHECK (net_weight_grams >= 0),
  posted_at timestamptz NOT NULL CHECK (posted_at >= TIMESTAMPTZ '2026-11-05 18:30:00+00'),
  event_key text NOT NULL,
  UNIQUE (company_id, event_key)
);
CREATE INDEX stock_movement_events_company_stock_idx
  ON public.stock_movement_events(company_id, stock_code, posted_at);
CREATE INDEX purchases_company_active_date_idx
  ON public.purchases(company_id, purchase_date) WHERE deleted_at IS NULL;
CREATE INDEX sales_company_active_date_idx
  ON public.sales(company_id, sales_date) WHERE deleted_at IS NULL;

-- Stage 1 development schema only. No ERP LocalStorage data is imported.
-- Source IDs and document numbers remain text; code/document uniqueness is unresolved.

CREATE TABLE companies (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  hsn text NOT NULL,
  gst text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('Gram', 'KG', 'Pkt')),
  net_weight numeric NOT NULL,
  stock_base_code text,
  purchase numeric NOT NULL,
  sale numeric NOT NULL,
  mrp numeric NOT NULL,
  base_cost numeric NOT NULL,
  packing_cost numeric NOT NULL,
  other_charges numeric NOT NULL,
  total_cost numeric NOT NULL,
  stock numeric NOT NULL,
  minimum_stock numeric NOT NULL,
  active boolean NOT NULL
);
CREATE INDEX products_company_code_idx ON products(company_id, code);

CREATE TABLE customers (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  source_record jsonb NOT NULL
);
CREATE INDEX customers_company_code_idx ON customers(company_id, code);

CREATE TABLE suppliers (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  source_record jsonb NOT NULL
);
CREATE INDEX suppliers_company_code_idx ON suppliers(company_id, code);

CREATE TABLE purchases (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  purchase_no text NOT NULL,
  purchase_date text NOT NULL,
  invoice_no text NOT NULL,
  supplier_code text NOT NULL,
  supplier_name text NOT NULL,
  contact_person text NOT NULL,
  total_qty numeric NOT NULL,
  total_amount numeric NOT NULL,
  total_gst_amount numeric NOT NULL,
  total_net_amount numeric NOT NULL,
  remarks text NOT NULL,
  posted_at timestamptz,
  source_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX purchases_company_date_idx ON purchases(company_id, purchase_date);

CREATE TABLE purchase_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id text NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  row_number integer NOT NULL,
  product_code text NOT NULL,
  product_name text NOT NULL,
  hsn text NOT NULL,
  unit text NOT NULL,
  qty numeric NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  gst numeric NOT NULL,
  gst_amount numeric NOT NULL,
  net_amount numeric NOT NULL,
  UNIQUE (purchase_id, row_number)
);

CREATE TABLE sales (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  sales_no text NOT NULL,
  sales_date text NOT NULL,
  invoice_no text NOT NULL,
  invoice_type text NOT NULL CHECK (invoice_type IN ('GST', 'NON_GST')),
  customer_code text NOT NULL,
  customer_name text NOT NULL,
  contact_person text NOT NULL,
  taxable_amount numeric NOT NULL,
  gst_amount numeric NOT NULL,
  cgst numeric NOT NULL,
  sgst numeric NOT NULL,
  igst numeric NOT NULL,
  grand_total numeric NOT NULL,
  payment_mode text NOT NULL,
  status text NOT NULL CHECK (status IN ('Completed', 'Pending', 'Cancelled')),
  remarks text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  posted_at timestamptz,
  source_record jsonb NOT NULL,
  created_on timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_company_date_idx ON sales(company_id, sales_date);

CREATE TABLE sales_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sales_id text NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  row_number integer NOT NULL,
  product_code text NOT NULL,
  product_name text NOT NULL,
  hsn text NOT NULL,
  unit text NOT NULL,
  qty numeric NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  gst numeric NOT NULL,
  gst_amount numeric NOT NULL,
  taxable_amount numeric NOT NULL,
  cgst numeric NOT NULL,
  sgst numeric NOT NULL,
  igst numeric NOT NULL,
  grand_total numeric NOT NULL,
  UNIQUE (sales_id, row_number)
);

-- This table represents a protected source baseline snapshot. It is not computed
-- from purchases, sales, current product mappings, or the post-cutover ledger.
CREATE TABLE stock_baselines (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  product_code text NOT NULL,
  product_name text NOT NULL,
  hsn text NOT NULL,
  unit text NOT NULL,
  opening_stock numeric NOT NULL,
  purchase_qty numeric NOT NULL,
  sales_qty numeric NOT NULL,
  current_stock numeric NOT NULL,
  captured_at timestamptz NOT NULL
);

CREATE FUNCTION reject_stock_baseline_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Stock baseline rows are immutable; use an approved corrective process';
END;
$$;

CREATE TRIGGER stock_baselines_no_update
BEFORE UPDATE OR DELETE ON stock_baselines
FOR EACH ROW EXECUTE FUNCTION reject_stock_baseline_mutation();

-- Separate company-scoped post-cutover movement ledger. The unique transaction
-- identity is the database idempotency boundary; posting and movements must share
-- a database transaction in a future application service.
CREATE TABLE stock_movement_transactions (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale', 'purchase')),
  transaction_id text NOT NULL,
  posted_at timestamptz NOT NULL,
  CHECK (posted_at >= TIMESTAMPTZ '2026-11-05 18:30:00+00'),
  state text NOT NULL CHECK (state IN ('posted', 'voided')),
  PRIMARY KEY (company_id, transaction_type, transaction_id)
);

CREATE TABLE stock_movements (
  company_id uuid NOT NULL,
  transaction_type text NOT NULL,
  transaction_id text NOT NULL,
  line_id text NOT NULL,
  product_code text NOT NULL,
  stock_code text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  quantity_kg numeric NOT NULL,
  unit text NOT NULL,
  source_quantity numeric NOT NULL,
  net_weight_grams numeric NOT NULL,
  PRIMARY KEY (company_id, transaction_type, transaction_id, line_id),
  FOREIGN KEY (company_id, transaction_type, transaction_id)
    REFERENCES stock_movement_transactions(company_id, transaction_type, transaction_id)
    ON DELETE RESTRICT
);

CREATE INDEX stock_movements_company_stock_idx
  ON stock_movements(company_id, stock_code);

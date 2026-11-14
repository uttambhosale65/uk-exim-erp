-- Separate export domain. Export records and stock are isolated from
-- domestic customers, purchases, sales, and stock.
CREATE TABLE public.export_customers (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('Active', 'Inactive')),
  review_status text NOT NULL DEFAULT 'review_required'
    CHECK (review_status IN ('review_required', 'owner_verified')),
  source_record jsonb NOT NULL CHECK (jsonb_typeof(source_record) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, code)
);
CREATE INDEX export_customers_company_name_idx
  ON public.export_customers(company_id, name);

CREATE TABLE public.export_documents (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  document_kind text NOT NULL CHECK (document_kind IN (
    'enquiry', 'quotation', 'proforma_invoice', 'order', 'purchase',
    'reservation', 'packing', 'shipment', 'commercial_invoice'
  )),
  document_number text NOT NULL,
  document_date text NOT NULL,
  currency text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  review_status text NOT NULL DEFAULT 'review_required'
    CHECK (review_status IN ('review_required', 'owner_verified')),
  source_record jsonb NOT NULL CHECK (jsonb_typeof(source_record) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, document_kind, document_number)
);
CREATE INDEX export_documents_company_kind_date_idx
  ON public.export_documents(company_id, document_kind, document_date DESC);

CREATE TABLE public.export_document_references (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  source_id text NOT NULL,
  source_kind text NOT NULL,
  target_id text NOT NULL,
  target_kind text NOT NULL,
  source_field text NOT NULL,
  PRIMARY KEY (company_id, source_id, source_field),
  FOREIGN KEY (company_id, source_id)
    REFERENCES public.export_documents(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, target_id)
    REFERENCES public.export_documents(company_id, id) ON DELETE RESTRICT
);
CREATE INDEX export_document_references_target_idx
  ON public.export_document_references(company_id, target_kind, target_id);

CREATE TABLE public.export_customer_document_references (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  document_id text NOT NULL,
  customer_id text NOT NULL,
  customer_code text NOT NULL,
  source_field text NOT NULL,
  PRIMARY KEY (company_id, document_id, source_field),
  FOREIGN KEY (company_id, document_id)
    REFERENCES public.export_documents(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, customer_id)
    REFERENCES public.export_customers(company_id, id) ON DELETE RESTRICT
);

CREATE TABLE public.export_stock (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  product_code text NOT NULL,
  lot_batch_no text NOT NULL DEFAULT '',
  available_qty numeric NOT NULL,
  reserved_qty numeric NOT NULL DEFAULT 0,
  packed_qty numeric NOT NULL DEFAULT 0,
  loaded_qty numeric NOT NULL DEFAULT 0,
  shipped_qty numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  stock_source text NOT NULL CHECK (stock_source IN ('purchase', 'opening', 'adjustment')),
  purchase_reference text NOT NULL DEFAULT '',
  review_status text NOT NULL DEFAULT 'review_required'
    CHECK (review_status IN ('review_required', 'owner_verified')),
  source_record jsonb NOT NULL CHECK (jsonb_typeof(source_record) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  CHECK (available_qty >= 0 AND reserved_qty >= 0 AND packed_qty >= 0
    AND loaded_qty >= 0 AND shipped_qty >= 0)
);
CREATE INDEX export_stock_company_product_idx
  ON public.export_stock(company_id, product_code, lot_batch_no);

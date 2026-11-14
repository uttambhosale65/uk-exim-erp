-- Additive domestic customer-receipt and supplier-payment ledger.
-- Historical imports stay balance-unverified and cannot be allocated until
-- an approved opening settlement balance model exists.
ALTER TABLE public.sales ADD CONSTRAINT sales_company_id_id_uq UNIQUE (company_id, id);
ALTER TABLE public.purchases ADD CONSTRAINT purchases_company_id_id_uq UNIQUE (company_id, id);

CREATE TABLE public.customer_receipts (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  request_key text NOT NULL,
  receipt_no text NOT NULL,
  received_on date NOT NULL,
  customer_code text NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Bank')),
  reference_no text NOT NULL DEFAULT '',
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  UNIQUE (company_id, id),
  UNIQUE (company_id, receipt_no),
  UNIQUE (company_id, request_key),
  FOREIGN KEY (company_id, customer_code)
    REFERENCES public.customers(company_id, code) ON DELETE RESTRICT
);
CREATE INDEX customer_receipts_company_date_idx
  ON public.customer_receipts(company_id, received_on DESC, receipt_no DESC);

CREATE TABLE public.supplier_payments (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  request_key text NOT NULL,
  payment_no text NOT NULL,
  paid_on date NOT NULL,
  supplier_code text NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Bank')),
  reference_no text NOT NULL DEFAULT '',
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  UNIQUE (company_id, id),
  UNIQUE (company_id, payment_no),
  UNIQUE (company_id, request_key),
  FOREIGN KEY (company_id, supplier_code)
    REFERENCES public.suppliers(company_id, code) ON DELETE RESTRICT
);
CREATE INDEX supplier_payments_company_date_idx
  ON public.supplier_payments(company_id, paid_on DESC, payment_no DESC);

CREATE TABLE public.customer_receipt_allocations (
  id text PRIMARY KEY,
  company_id uuid NOT NULL,
  receipt_id text NOT NULL,
  sales_id text NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, receipt_id)
    REFERENCES public.customer_receipts(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, sales_id)
    REFERENCES public.sales(company_id, id) ON DELETE RESTRICT,
  UNIQUE (company_id, receipt_id, sales_id)
);
CREATE INDEX customer_receipt_allocations_sales_idx
  ON public.customer_receipt_allocations(company_id, sales_id);

CREATE TABLE public.supplier_payment_allocations (
  id text PRIMARY KEY,
  company_id uuid NOT NULL,
  payment_id text NOT NULL,
  purchase_id text NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, payment_id)
    REFERENCES public.supplier_payments(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, purchase_id)
    REFERENCES public.purchases(company_id, id) ON DELETE RESTRICT,
  UNIQUE (company_id, payment_id, purchase_id)
);
CREATE INDEX supplier_payment_allocations_purchase_idx
  ON public.supplier_payment_allocations(company_id, purchase_id);

CREATE FUNCTION public.validate_customer_receipt_allocation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  receipt_row public.customer_receipts%ROWTYPE;
  sale_row public.sales%ROWTYPE;
  receipt_allocated numeric(18,2);
  invoice_allocated numeric(18,2);
BEGIN
  SELECT * INTO receipt_row FROM public.customer_receipts
    WHERE company_id = NEW.company_id AND id = NEW.receipt_id FOR UPDATE;
  IF NOT FOUND OR receipt_row.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'Receipt is unavailable for allocation';
  END IF;
  SELECT * INTO sale_row FROM public.sales
    WHERE company_id = NEW.company_id AND id = NEW.sales_id FOR UPDATE;
  IF NOT FOUND OR sale_row.deleted_at IS NOT NULL OR sale_row.status = 'Cancelled' THEN
    RAISE EXCEPTION 'Sales invoice is unavailable for allocation';
  END IF;
  IF sale_row.historical_imported THEN
    RAISE EXCEPTION 'Historical invoice balance is unverified; allocation is blocked';
  END IF;
  IF sale_row.customer_code <> receipt_row.customer_code THEN
    RAISE EXCEPTION 'Receipt and invoice customer do not match';
  END IF;
  SELECT coalesce(sum(amount), 0) INTO receipt_allocated
    FROM public.customer_receipt_allocations
    WHERE company_id = NEW.company_id AND receipt_id = NEW.receipt_id;
  SELECT coalesce(sum(a.amount), 0) INTO invoice_allocated
    FROM public.customer_receipt_allocations a
    JOIN public.customer_receipts r ON r.company_id = a.company_id AND r.id = a.receipt_id
    WHERE a.company_id = NEW.company_id AND a.sales_id = NEW.sales_id AND r.voided_at IS NULL;
  IF receipt_allocated + NEW.amount > receipt_row.amount THEN
    RAISE EXCEPTION 'Receipt allocations exceed receipt amount';
  END IF;
  IF invoice_allocated + NEW.amount > sale_row.grand_total THEN
    RAISE EXCEPTION 'Receipt allocations exceed invoice total';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER customer_receipt_allocation_guard
BEFORE INSERT ON public.customer_receipt_allocations
FOR EACH ROW EXECUTE FUNCTION public.validate_customer_receipt_allocation();

CREATE FUNCTION public.validate_supplier_payment_allocation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  payment_row public.supplier_payments%ROWTYPE;
  purchase_row public.purchases%ROWTYPE;
  payment_allocated numeric(18,2);
  invoice_allocated numeric(18,2);
BEGIN
  SELECT * INTO payment_row FROM public.supplier_payments
    WHERE company_id = NEW.company_id AND id = NEW.payment_id FOR UPDATE;
  IF NOT FOUND OR payment_row.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'Supplier payment is unavailable for allocation';
  END IF;
  SELECT * INTO purchase_row FROM public.purchases
    WHERE company_id = NEW.company_id AND id = NEW.purchase_id FOR UPDATE;
  IF NOT FOUND OR purchase_row.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Purchase invoice is unavailable for allocation';
  END IF;
  IF purchase_row.historical_imported THEN
    RAISE EXCEPTION 'Historical invoice balance is unverified; allocation is blocked';
  END IF;
  IF purchase_row.supplier_code <> payment_row.supplier_code THEN
    RAISE EXCEPTION 'Payment and invoice supplier do not match';
  END IF;
  SELECT coalesce(sum(amount), 0) INTO payment_allocated
    FROM public.supplier_payment_allocations
    WHERE company_id = NEW.company_id AND payment_id = NEW.payment_id;
  SELECT coalesce(sum(a.amount), 0) INTO invoice_allocated
    FROM public.supplier_payment_allocations a
    JOIN public.supplier_payments p ON p.company_id = a.company_id AND p.id = a.payment_id
    WHERE a.company_id = NEW.company_id AND a.purchase_id = NEW.purchase_id AND p.voided_at IS NULL;
  IF payment_allocated + NEW.amount > payment_row.amount THEN
    RAISE EXCEPTION 'Payment allocations exceed payment amount';
  END IF;
  IF invoice_allocated + NEW.amount > purchase_row.total_net_amount THEN
    RAISE EXCEPTION 'Payment allocations exceed purchase total';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER supplier_payment_allocation_guard
BEFORE INSERT ON public.supplier_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_payment_allocation();

CREATE FUNCTION public.protect_settlement_ledger_rows() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Settlement ledger entries are retained; void the header instead';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.voided_at IS NOT NULL OR NEW.voided_at IS NULL OR
       (to_jsonb(NEW) - 'voided_at') <> (to_jsonb(OLD) - 'voided_at') THEN
      RAISE EXCEPTION 'Settlement entries are immutable; only a one-way void is allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER customer_receipts_immutable
BEFORE UPDATE OR DELETE ON public.customer_receipts
FOR EACH ROW EXECUTE FUNCTION public.protect_settlement_ledger_rows();
CREATE TRIGGER supplier_payments_immutable
BEFORE UPDATE OR DELETE ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.protect_settlement_ledger_rows();
CREATE FUNCTION public.reject_settlement_allocation_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Settlement allocations are immutable';
END;
$$;
CREATE TRIGGER customer_receipt_allocations_immutable
BEFORE UPDATE OR DELETE ON public.customer_receipt_allocations
FOR EACH ROW EXECUTE FUNCTION public.reject_settlement_allocation_mutation();
CREATE TRIGGER supplier_payment_allocations_immutable
BEFORE UPDATE OR DELETE ON public.supplier_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.reject_settlement_allocation_mutation();

COMMENT ON TABLE public.customer_receipts IS
  'Future receipt ledger. No balances are inferred for historical imported invoices.';
COMMENT ON TABLE public.supplier_payments IS
  'Future supplier payment ledger. No balances are inferred for historical imported purchases.';

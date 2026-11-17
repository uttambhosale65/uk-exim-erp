import "server-only";
import { HEURISTIC_CUSTOMER_CODES, HEURISTIC_DOCUMENT_IDS } from "../international/export/review-flags.mjs";

const failure = (code, message) => Object.assign(new Error(message), { code });

export function createDashboardBusinessSummaryDAL({ getOwnerContext, database }) {
  if (typeof getOwnerContext !== "function" || !database?.query) throw new Error("Business summary requires owner authorization and a database.");
  return {
    async getSummary() {
      const owner = await getOwnerContext();
      const companyId = owner?.company?.company_id;
      if (!companyId) throw failure("UNAUTHENTICATED", "Sign in is required.");
      const schema = await database.query(`SELECT
        to_regclass('public.export_customers') IS NOT NULL AS export_customers,
        to_regclass('public.export_documents') IS NOT NULL AS export_documents,
        to_regclass('public.customer_receipts') IS NOT NULL AS customer_receipts,
        to_regclass('public.supplier_payments') IS NOT NULL AS supplier_payments`);
      const flags = schema.rows[0] ?? {};
      let exports = { status: "schema_pending" };
      if (flags.export_customers && flags.export_documents) {
        const result = await database.query(`SELECT
          (SELECT count(*) FILTER (WHERE review_status='owner_verified')::int FROM public.export_customers WHERE company_id=$1) AS customers,
          (SELECT count(*) FILTER (WHERE review_status='review_required')::int FROM public.export_customers WHERE company_id=$1) AS customer_review_required,
          (SELECT count(*) FILTER (WHERE code=ANY($2::text[]))::int FROM public.export_customers WHERE company_id=$1) AS "heuristicCustomerCount",
          count(*) FILTER (WHERE document_kind='enquiry' AND review_status='owner_verified')::int AS enquiries,
          count(*) FILTER (WHERE document_kind='enquiry' AND review_status='review_required')::int AS "enquiriesReviewRequired",
          count(*) FILTER (WHERE document_kind='quotation' AND review_status='owner_verified')::int AS quotations,
          count(*) FILTER (WHERE document_kind='quotation' AND review_status='review_required')::int AS "quotationsReviewRequired",
          count(*) FILTER (WHERE document_kind='proforma_invoice' AND review_status='owner_verified')::int AS proformas,
          count(*) FILTER (WHERE document_kind='proforma_invoice' AND review_status='review_required')::int AS "proformasReviewRequired",
          count(*) FILTER (WHERE document_kind='order' AND review_status='owner_verified')::int AS orders,
          count(*) FILTER (WHERE document_kind='order' AND review_status='review_required')::int AS "ordersReviewRequired",
          count(*) FILTER (WHERE document_kind='purchase' AND review_status='owner_verified')::int AS purchases,
          count(*) FILTER (WHERE document_kind='purchase' AND review_status='review_required')::int AS "purchasesReviewRequired",
          count(*) FILTER (WHERE document_kind='reservation' AND review_status='owner_verified')::int AS reservations,
          count(*) FILTER (WHERE document_kind='reservation' AND review_status='review_required')::int AS "reservationsReviewRequired",
          count(*) FILTER (WHERE document_kind='packing' AND review_status='owner_verified')::int AS packings,
          count(*) FILTER (WHERE document_kind='packing' AND review_status='review_required')::int AS "packingsReviewRequired",
          count(*) FILTER (WHERE document_kind='shipment' AND review_status='owner_verified')::int AS shipments,
          count(*) FILTER (WHERE document_kind='shipment' AND review_status='review_required')::int AS "shipmentsReviewRequired",
          count(*) FILTER (WHERE document_kind='commercial_invoice' AND review_status='owner_verified')::int AS invoices,
          count(*) FILTER (WHERE document_kind='commercial_invoice' AND review_status='review_required')::int AS "invoicesReviewRequired",
          count(*) FILTER (WHERE id::text=ANY($3::text[]))::int AS "heuristicDocumentCount",
          count(*) FILTER (WHERE review_status='review_required')::int AS reviewRequired
          FROM public.export_documents WHERE company_id=$1`, [companyId, HEURISTIC_CUSTOMER_CODES, HEURISTIC_DOCUMENT_IDS]);
        const stock = await database.query(`SELECT
          count(*) FILTER (WHERE review_status='owner_verified')::int AS count,
          count(*) FILTER (WHERE review_status='review_required')::int AS review_required,
          count(*) FILTER (WHERE id::text=ANY($2::text[]))::int AS heuristic_review_required
          FROM public.export_stock WHERE company_id=$1`, [companyId, []]);
        const register = await database.query(`SELECT document_kind,
          count(*)::int AS available_count,
          count(*) FILTER (WHERE lower(coalesce(status,''))='draft')::int AS draft_count,
          count(*) FILTER (WHERE lower(coalesce(status,''))='issued')::int AS issued_count,
          count(*) FILTER (WHERE review_status='review_required')::int AS review_pending_count
          FROM public.export_documents WHERE company_id=$1 GROUP BY document_kind`, [companyId]);
        exports = { status: "ready", ...result.rows[0], stock: stock.rows[0].count, stockReviewRequired: stock.rows[0].review_required, heuristicStockCount: stock.rows[0].heuristic_review_required,
          documentRegister: register.rows.map((row) => ({ kind: row.document_kind, availableCount: row.available_count, draftCount: row.draft_count, issuedCount: row.issued_count, reviewPendingCount: row.review_pending_count, evidenceStatus: "not_tracked" })) };
      }
      let payments = { status: "schema_pending" };
      if (flags.customer_receipts && flags.supplier_payments) {
        const result = await database.query(`SELECT
          coalesce((SELECT sum(amount) FROM public.customer_receipts WHERE company_id=$1 AND voided_at IS NULL),0)::text AS receipts_total,
          (SELECT count(*)::int FROM public.customer_receipts WHERE company_id=$1 AND voided_at IS NULL) AS receipt_count,
          coalesce((SELECT sum(amount) FROM public.supplier_payments WHERE company_id=$1 AND voided_at IS NULL),0)::text AS supplier_payments_total,
          (SELECT count(*)::int FROM public.supplier_payments WHERE company_id=$1 AND voided_at IS NULL) AS supplier_payment_count,
          coalesce((SELECT sum(i.grand_total-coalesce(a.paid,0)) FROM public.sales i LEFT JOIN (
            SELECT a.company_id,a.sales_id,sum(a.amount) FILTER (WHERE r.voided_at IS NULL) AS paid
            FROM public.customer_receipt_allocations a JOIN public.customer_receipts r ON r.company_id=a.company_id AND r.id=a.receipt_id
            GROUP BY a.company_id,a.sales_id) a ON a.company_id=i.company_id AND a.sales_id=i.id
            WHERE i.company_id=$1 AND i.deleted_at IS NULL AND NOT i.historical_imported AND i.status<>'Cancelled' AND i.grand_total>coalesce(a.paid,0)),0)::text AS verified_receivables,
          coalesce((SELECT sum(i.total_net_amount-coalesce(a.paid,0)) FROM public.purchases i LEFT JOIN (
            SELECT a.company_id,a.purchase_id,sum(a.amount) FILTER (WHERE p.voided_at IS NULL) AS paid
            FROM public.supplier_payment_allocations a JOIN public.supplier_payments p ON p.company_id=a.company_id AND p.id=a.payment_id
            GROUP BY a.company_id,a.purchase_id) a ON a.company_id=i.company_id AND a.purchase_id=i.id
            WHERE i.company_id=$1 AND i.deleted_at IS NULL AND NOT i.historical_imported AND i.total_net_amount>coalesce(a.paid,0)),0)::text AS verified_payables`, [companyId]);
        payments = { status: "ready", ...result.rows[0] };
      }
      return { exports, payments };
    },
  };
}

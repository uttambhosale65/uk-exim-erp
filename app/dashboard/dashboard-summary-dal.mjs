import "server-only";

const failure = (code, message) => Object.assign(new Error(message), { code });

export function createDashboardSummaryDAL({ getOwnerContext, database }) {
  if (typeof getOwnerContext !== "function" || !database?.query) {
    throw new Error("Dashboard summary requires owner authorization and a database.");
  }

  return {
    async getSummary({ year, month }) {
      if (!Number.isInteger(year) || year < 2000 || year > 2100
        || !Number.isInteger(month) || month < 1 || month > 12) {
        throw failure("INVALID_QUERY", "Dashboard reporting period is invalid.");
      }

      const owner = await getOwnerContext();
      const companyId = owner?.company?.company_id;
      if (!companyId) throw failure("UNAUTHENTICATED", "Sign in is required.");

      const deletionColumns = await database.query(`SELECT table_name FROM information_schema.columns
        WHERE table_schema='public' AND column_name='deleted_at' AND table_name IN ('purchases','sales')`);
      const softDeleteFilter = new Set(deletionColumns.rows.map((row) => row.table_name));
      const purchaseActive = softDeleteFilter.has("purchases") ? "AND deleted_at IS NULL" : "";
      const salesActive = softDeleteFilter.has("sales") ? "AND deleted_at IS NULL" : "";

      const { rows } = await database.query(`SELECT
        (SELECT count(*)::int FROM public.suppliers WHERE company_id=$1) AS "supplierCount",
        coalesce((SELECT sum(total_net_amount) FROM public.purchases WHERE company_id=$1 ${purchaseActive}),0)::text AS "purchaseTotal",
        coalesce((SELECT sum(grand_total) FROM public.sales WHERE company_id=$1 ${salesActive}),0)::text AS "salesTotal",
        (SELECT count(*)::int FROM public.sales WHERE company_id=$1 ${salesActive} AND status='Pending') AS "pendingSalesCount",
        coalesce((SELECT sum(total_net_amount) FROM public.purchases WHERE company_id=$1 ${purchaseActive}
          AND purchase_date::date >= make_date($2,$3,1) AND purchase_date::date < (make_date($2,$3,1) + interval '1 month')),0)::text AS "monthlyPurchaseTotal",
        coalesce((SELECT sum(grand_total) FROM public.sales WHERE company_id=$1 ${salesActive}
          AND sales_date::date >= make_date($2,$3,1) AND sales_date::date < (make_date($2,$3,1) + interval '1 month')),0)::text AS "monthlySalesTotal",
        coalesce((SELECT sum(grand_total) FROM public.sales WHERE company_id=$1 ${salesActive} AND invoice_type='GST'
          AND sales_date::date >= make_date($2,$3,1) AND sales_date::date < (make_date($2,$3,1) + interval '1 month')),0)::text AS "monthlyGstSalesTotal",
        coalesce((SELECT sum(grand_total) FROM public.sales WHERE company_id=$1 ${salesActive} AND invoice_type='NON_GST'
          AND sales_date::date >= make_date($2,$3,1) AND sales_date::date < (make_date($2,$3,1) + interval '1 month')),0)::text AS "monthlyNonGstSalesTotal",
        coalesce((SELECT json_agg(json_build_object('id',id,'salesNo',sales_no,'salesDate',sales_date::text,
          'customerName',customer_name,'paymentMode',payment_mode,'invoiceTotal',grand_total::text) ORDER BY created_on DESC,sales_date DESC,sales_no DESC)
          FROM public.sales WHERE company_id=$1 ${salesActive} AND status='Pending'),'[]'::json) AS "pendingSales"`,
      [companyId, year, month]);

      const row = rows[0];
      const monthlyStockResult = await database.query(`WITH baseline AS (
          SELECT coalesce(sum(current_stock),0) AS total_stock,min(effective_at) AS effective_at
          FROM public.stock_baselines WHERE company_id=$1 AND verification_status='verified'
        ), months AS (
          SELECT series.month_start::date AS month_start
          FROM baseline b CROSS JOIN LATERAL generate_series(
            date_trunc('month',b.effective_at AT TIME ZONE 'Asia/Calcutta'),
            date_trunc('month',CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta'),interval '1 month'
          ) AS series(month_start)
          WHERE b.effective_at IS NOT NULL
        ), events_by_month AS (
          SELECT date_trunc('month',e.posted_at AT TIME ZONE 'Asia/Calcutta')::date AS month_start,e.transaction_type,
            sum(e.quantity_delta_kg) AS delta
          FROM public.stock_movement_events e
          JOIN public.stock_baselines b ON b.company_id=e.company_id AND b.product_code=e.stock_code AND b.verification_status='verified'
          WHERE e.company_id=$1 AND e.posted_at>=b.effective_at
          GROUP BY date_trunc('month',e.posted_at AT TIME ZONE 'Asia/Calcutta')::date,e.transaction_type
        )
        SELECT to_char(m.month_start,'YYYY-MM') AS month,
          (b.total_stock+coalesce(sum(e.delta) FILTER (WHERE e.month_start<m.month_start),0))::text AS "openingTotal",
          coalesce(sum(e.delta) FILTER (WHERE e.month_start=m.month_start AND e.transaction_type='purchase'),0)::text AS "purchaseTotal",
          coalesce(-sum(e.delta) FILTER (WHERE e.month_start=m.month_start AND e.transaction_type='sale'),0)::text AS "salesTotal",
          (b.total_stock+coalesce(sum(e.delta) FILTER (WHERE e.month_start<=m.month_start),0))::text AS "closingTotal"
        FROM months m CROSS JOIN baseline b LEFT JOIN events_by_month e ON e.month_start<=m.month_start
        GROUP BY m.month_start,b.total_stock ORDER BY m.month_start`, [companyId]);

      return {
        supplierCount: Number(row.supplierCount),
        purchaseTotal: row.purchaseTotal,
        salesTotal: row.salesTotal,
        pendingSalesCount: Number(row.pendingSalesCount),
        monthlyPurchaseTotal: row.monthlyPurchaseTotal,
        monthlySalesTotal: row.monthlySalesTotal,
        monthlyGstSalesTotal: row.monthlyGstSalesTotal,
        monthlyNonGstSalesTotal: row.monthlyNonGstSalesTotal,
        pendingSales: row.pendingSales,
        monthlyStock: monthlyStockResult.rows,
      };
    },
  };
}

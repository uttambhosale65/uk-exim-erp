import "server-only";
export function createStockDAL({getOwnerContext,database}) {
  return { async listCurrentStock() {
    const owner=await getOwnerContext(),companyId=owner?.company?.company_id;
    if(!companyId)throw Object.assign(new Error("Sign in is required."),{code:"UNAUTHENTICATED"});
    const {rows}=await database.query(`WITH transaction_line_net AS (
        SELECT company_id,transaction_type,transaction_id,line_id,stock_code,sum(quantity_delta_kg) AS net_delta
        FROM public.stock_movement_events WHERE company_id=$1
        GROUP BY company_id,transaction_type,transaction_id,line_id,stock_code
      ), effective_movements AS (
        SELECT company_id,stock_code,
          sum(net_delta) FILTER (WHERE net_delta>0 AND transaction_type='purchase') AS net_purchase,
          sum(-net_delta) FILTER (WHERE net_delta<0 AND transaction_type='sale') AS net_sales
        FROM transaction_line_net GROUP BY company_id,stock_code
      ), gross_movements AS (
        SELECT company_id,stock_code,
          sum(quantity_delta_kg) FILTER (WHERE quantity_delta_kg>0) AS gross_purchase,
          sum(-quantity_delta_kg) FILTER (WHERE quantity_delta_kg<0) AS gross_sales,
          sum(quantity_delta_kg) AS net_delta
        FROM public.stock_movement_events WHERE company_id=$1 GROUP BY company_id,stock_code
      )
      SELECT b.id,b.product_code AS "productCode",b.product_name AS "productName",b.hsn,b.unit,p.minimum_stock::text AS "minimumStock",
        b.opening_stock::text AS "openingStock",(b.purchase_qty+coalesce(em.net_purchase,0))::text AS "purchaseQty",
        (b.sales_qty+coalesce(em.net_sales,0))::text AS "salesQty",
        coalesce(gm.gross_purchase,0)::text AS "grossPurchaseMovementQty",coalesce(gm.gross_sales,0)::text AS "grossSalesMovementQty",
        b.current_stock::text AS "protectedBaseline",coalesce(gm.net_delta,0)::text AS "postCutoverDelta",
        (b.current_stock+coalesce(gm.net_delta,0))::text AS "currentStock"
      FROM public.stock_baselines b LEFT JOIN public.products p ON p.company_id=b.company_id AND p.code=b.product_code
      LEFT JOIN effective_movements em ON em.company_id=b.company_id AND em.stock_code=b.product_code
      LEFT JOIN gross_movements gm ON gm.company_id=b.company_id AND gm.stock_code=b.product_code
      WHERE b.company_id=$1 AND b.verification_status='verified' ORDER BY b.product_code`,[companyId]);
    return rows;
  }, async listLedger({limit=500,offset=0}={}) {
    const owner=await getOwnerContext(),companyId=owner?.company?.company_id;
    if(!companyId)throw Object.assign(new Error("Sign in is required."),{code:"UNAUTHENTICATED"});
    if(!Number.isInteger(limit)||limit<1||limit>1000||!Number.isInteger(offset)||offset<0)throw Object.assign(new Error("Ledger page is invalid."),{code:"INVALID_QUERY"});
    const {rows}=await database.query(`SELECT transaction_type AS "transactionType",transaction_id AS "transactionId",revision,event_type AS "eventType",line_id AS "lineId",product_code AS "productCode",stock_code AS "stockCode",quantity_delta_kg::text AS "quantityDeltaKg",source_quantity::text AS "sourceQuantity",unit,net_weight_grams::text AS "netWeightGrams",posted_at AS "postedAt"
      FROM public.stock_movement_events WHERE company_id=$1 ORDER BY posted_at DESC,id DESC LIMIT $2 OFFSET $3`,[companyId,limit,offset]);
    return rows;
  }};
}

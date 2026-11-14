import "server-only";
import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool, verifyProductsUiTestDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { createTradeDAL } from "./trade-dal.mjs";
import { createTradeRouteHandlers } from "./trade-routes.mjs";
import { requireTradeSchema } from "./trade-schema-guard.mjs";
import { isTaxConfigurationApproved } from "@/app/tax/india-gst-engine.mjs";

const database=getDatabasePool();
const testMode=isProductsUiTestMode();
async function getSalesTaxPolicy(companyId: string): Promise<Record<string, unknown> | null> {
  try {
    const { rows } = await database.query(
      "SELECT configuration,revision,approval_status FROM public.company_tax_configurations WHERE company_id=$1",
      [companyId],
    );
    const row = rows[0];
    if (!row) return null;
    return { ...row.configuration, revision: row.revision,
      approved: row.approval_status === "approved" && isTaxConfigurationApproved(row.configuration) };
  } catch {
    return null;
  }
}
const dal=createTradeDAL({database,getSalesTaxPolicy,getOwnerContext:async()=>{const owner=await getOwnerContext();if(owner){if(testMode)await verifyProductsUiTestDatabasePool(database);await requireTradeSchema(database);}return owner;}});
export const purchaseHandlers=createTradeRouteHandlers(dal,"purchase");
export const saleHandlers=createTradeRouteHandlers(dal,"sale");

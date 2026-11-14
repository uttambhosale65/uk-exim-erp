import "server-only";
import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool } from "@/app/lib/db/pool";
import { createSettlementDAL } from "./settlement-dal.mjs";
import { createSettlementRouteHandlers } from "./settlement-routes.mjs";

const database = getDatabasePool();
async function requireSettlementSchema() {
  const result = await database.query("SELECT 1 FROM public._schema_migrations WHERE name=$1 LIMIT 1", ["013_settlement_ledger.sql"]);
  if (!result.rowCount) throw Object.assign(new Error("Receipts and Payments are unavailable until the settlement schema migration is applied."), { code: "SCHEMA_PENDING" });
}
const dal = createSettlementDAL({
  database,
  getOwnerContext: async () => {
    const owner = await getOwnerContext();
    if (owner) await requireSettlementSchema();
    return owner;
  },
});
export const customerReceiptHandlers = createSettlementRouteHandlers(dal, "receipt");
export const supplierPaymentHandlers = createSettlementRouteHandlers(dal, "supplierPayment");

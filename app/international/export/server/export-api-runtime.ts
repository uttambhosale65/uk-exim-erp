import "server-only";
import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool, verifyProductsUiTestDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { createExportDAL } from "./export-dal.mjs";
import { createExportRouteHandlers } from "./export-routes.mjs";

const database = getDatabasePool();
const testMode = isProductsUiTestMode();
const dal = createExportDAL({
  database,
  getOwnerContext: async () => {
    const owner = await getOwnerContext();
    if (owner && testMode) await verifyProductsUiTestDatabasePool(database);
    if (owner) {
      try {
        const schema = await database.query("SELECT to_regclass('public.export_documents') AS documents, to_regclass('public.export_customers') AS customers, to_regclass('public.export_stock') AS stock");
        if (!schema.rows[0]?.documents || !schema.rows[0]?.customers || !schema.rows[0]?.stock) {
          throw Object.assign(new Error("Export database schema is pending."), { code: "SCHEMA_PENDING" });
        }
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "SCHEMA_PENDING") throw error;
        throw Object.assign(new Error("Export database schema is unavailable."), { code: "SCHEMA_PENDING" });
      }
    }
    return owner;
  },
});

export const exportHandlers = createExportRouteHandlers(dal);

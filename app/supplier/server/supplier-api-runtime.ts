import "server-only";

import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool, verifyProductsUiTestDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { createSupplierDAL } from "@/app/supplier/server/supplier-dal.mjs";
import { createSupplierRouteHandlers } from "@/app/supplier/server/supplier-routes.mjs";

const database = getDatabasePool();
const testMode = isProductsUiTestMode();
const supplierDAL = createSupplierDAL({
  getOwnerContext: async () => {
    const owner = await getOwnerContext();
    if (testMode) await verifyProductsUiTestDatabasePool(database);
    return owner;
  },
  database,
});

export const supplierRouteHandlers = createSupplierRouteHandlers(supplierDAL);

import "server-only";

import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool, verifyProductsUiTestDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { createCustomerDAL } from "@/app/customer/server/customer-dal.mjs";
import { createCustomerRouteHandlers } from "@/app/customer/server/customer-routes.mjs";

export const dynamic = "force-dynamic";

const database = getDatabasePool();
const testMode = isProductsUiTestMode();
const customerDAL = createCustomerDAL({
  getOwnerContext: async () => {
    const owner = await getOwnerContext();
    if (testMode) await verifyProductsUiTestDatabasePool(database);
    return owner;
  },
  database,
});
const handlers = createCustomerRouteHandlers(customerDAL);

export const POST = handlers.duplicateCheck;

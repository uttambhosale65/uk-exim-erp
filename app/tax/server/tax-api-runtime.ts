import "server-only";
import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool, verifyProductsUiTestDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { createTaxConfigurationDAL } from "./tax-configuration-dal.mjs";

const database = getDatabasePool();
const testMode = isProductsUiTestMode();
export const taxConfigurationDAL = createTaxConfigurationDAL({
  database,
  getOwnerContext: async () => {
    const owner = await getOwnerContext();
    if (owner && testMode) await verifyProductsUiTestDatabasePool(database);
    return owner;
  },
});

import "server-only";

import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool, verifyProductsUiTestDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { createSettingsDAL } from "./settings-dal.mjs";
import { createSettingsRouteHandlers } from "./settings-routes.mjs";

const database = getDatabasePool();
const testMode = isProductsUiTestMode();
const settingsDAL = createSettingsDAL({
  database,
  getOwnerContext: async () => {
    const owner = await getOwnerContext();
    if (testMode) await verifyProductsUiTestDatabasePool(database);
    return owner;
  },
});

export const settingsHandlers = createSettingsRouteHandlers(settingsDAL);

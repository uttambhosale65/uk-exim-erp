import "server-only";

import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool, verifyProductsUiTestDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { createProductDAL } from "@/app/product/server/product-dal.mjs";
import { createProductRouteHandlers } from "@/app/product/server/product-routes.mjs";
import { registerProductsUiTestProduct } from "@/app/product/server/products-ui-test-manifest.server";

export const dynamic = "force-dynamic";

const database = getDatabasePool();
const testMode = isProductsUiTestMode();
const productDAL = createProductDAL({
  getOwnerContext: async () => {
    const owner = await getOwnerContext();
    if (testMode) await verifyProductsUiTestDatabasePool(database);
    return owner;
  },
  database,
  ...(testMode ? { onProductCreate: registerProductsUiTestProduct } : {}),
});
const handlers = createProductRouteHandlers(productDAL);

export const GET = handlers.list;
export const POST = handlers.create;

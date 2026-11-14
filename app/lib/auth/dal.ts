import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../auth";
import { getAuthDatabasePool, getDatabasePool, verifyConfiguredDatabasePool } from "../db/pool";
import {
  isProductsUiTestMode,
  PRODUCTS_UI_TEST_COMPANY_NAME,
} from "../db/products-ui-test.mjs";
import { resolveOwnerContext } from "./authorization.mjs";

export async function getOwnerContext() {
  const authDatabase = getAuthDatabasePool();
  const testMode = isProductsUiTestMode();
  await Promise.all([
    verifyConfiguredDatabasePool(authDatabase),
    verifyConfiguredDatabasePool(getDatabasePool()),
  ]);
  const session = await auth.api.getSession({ headers: await headers() });
  return resolveOwnerContext(
    authDatabase,
    session,
    testMode ? PRODUCTS_UI_TEST_COMPANY_NAME : undefined,
  );
}

export async function requireOwnerContext() {
  const context = await getOwnerContext();
  if (!context) redirect("/login");
  return context;
}

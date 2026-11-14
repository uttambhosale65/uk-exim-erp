import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/app/lib/auth";
import { getAuthDatabasePool, verifyConfiguredDatabasePool } from "@/app/lib/db/pool";
import { isProductsUiTestMode } from "@/app/lib/db/products-ui-test.mjs";
import { recordProductsUiTestRateLimits } from "@/app/product/server/products-ui-test-manifest.server";
import { getOwnerContext } from "@/app/lib/auth/dal";
import { rejectUnownedPasswordChange } from "@/app/lib/auth/request-policy.mjs";

const handlers = toNextJsHandler(auth);

async function handleAuthRequest(request: Request) {
  const testMode = isProductsUiTestMode();
  const authPool = getAuthDatabasePool();
  await verifyConfiguredDatabasePool(authPool);
  const passwordChangeRejection = await rejectUnownedPasswordChange(request, getOwnerContext);
  if (passwordChangeRejection) return passwordChangeRejection;
  const response = request.method === "GET"
    ? await handlers.GET(request)
    : await handlers.POST(request);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Cache-Control", "no-store, private");
  responseHeaders.set("Pragma", "no-cache");
  const safeResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
  if (testMode) await recordProductsUiTestRateLimits(authPool, request);
  return safeResponse;
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;

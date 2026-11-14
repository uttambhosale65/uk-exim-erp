import "server-only";

import { customerRouteHandlers as handlers } from "@/app/customer/server/customer-api-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("countOnly") === "1") {
    return handlers.count();
  }
  return handlers.list(request);
}
export const POST = handlers.create;

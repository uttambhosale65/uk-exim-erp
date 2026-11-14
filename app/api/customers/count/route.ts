import "server-only";

import { customerRouteHandlers } from "@/app/customer/server/customer-api-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  return customerRouteHandlers.count();
}

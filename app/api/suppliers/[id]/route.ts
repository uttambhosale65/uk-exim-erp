import "server-only";

import { supplierRouteHandlers as handlers } from "@/app/supplier/server/supplier-api-runtime";

export const dynamic = "force-dynamic";

type SupplierRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: SupplierRouteContext) {
  return handlers.get(request, (await context.params).id);
}

export async function PATCH(request: Request, context: SupplierRouteContext) {
  return handlers.update(request, (await context.params).id);
}

export async function DELETE(request: Request, context: SupplierRouteContext) {
  return handlers.setStatus(request, (await context.params).id, "Inactive");
}

export async function POST(request: Request, context: SupplierRouteContext) {
  return handlers.setStatus(request, (await context.params).id, "Active");
}

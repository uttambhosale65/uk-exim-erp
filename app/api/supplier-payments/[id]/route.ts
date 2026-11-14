import "server-only";
import { supplierPaymentHandlers as handlers } from "@/app/transactions/server/settlement-api-runtime";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handlers.get(request, (await context.params).id);
}

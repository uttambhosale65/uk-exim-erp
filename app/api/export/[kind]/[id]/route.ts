import "server-only";
import { exportHandlers } from "@/app/international/export/server/export-api-runtime";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ kind: string; id: string }> };
export async function GET(request: Request, context: RouteContext) {
  const { kind, id } = await context.params;
  return exportHandlers.get(request, kind, id);
}
export async function PUT(request: Request, context: RouteContext) {
  const { kind, id } = await context.params;
  return exportHandlers.update(request, kind, id);
}
export async function PATCH(request: Request, context: RouteContext) {
  const { kind, id } = await context.params;
  return exportHandlers.review(request, kind, id);
}

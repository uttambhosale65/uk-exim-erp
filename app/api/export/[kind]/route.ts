import "server-only";
import { exportHandlers } from "@/app/international/export/server/export-api-runtime";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ kind: string }> };
export async function GET(request: Request, context: RouteContext) {
  const { kind } = await context.params;
  return exportHandlers.list(request, kind);
}
export async function POST(request: Request, context: RouteContext) {
  const { kind } = await context.params;
  return exportHandlers.create(request, kind);
}

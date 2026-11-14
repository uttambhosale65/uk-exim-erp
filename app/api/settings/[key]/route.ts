import "server-only";

import { settingsHandlers as handlers } from "@/app/settings/server/settings-api-runtime";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { key } = await context.params;
  return handlers.get(request, key);
}

export async function PUT(request: Request, context: RouteContext) {
  const { key } = await context.params;
  return handlers.save(request, key);
}

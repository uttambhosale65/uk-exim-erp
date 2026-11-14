import "server-only";

import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool } from "@/app/lib/db/pool";
import { createDashboardSummaryDAL } from "@/app/dashboard/dashboard-summary-dal.mjs";

export const dynamic = "force-dynamic";

const dal = createDashboardSummaryDAL({
  getOwnerContext: async () => {
    return getOwnerContext();
  },
  database: getDatabasePool(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  try {
    return Response.json(await dal.getSummary({ year, month }), {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const status = code === "UNAUTHENTICATED" ? 401 : code === "INVALID_QUERY" ? 400 : 500;
    return Response.json({ error: status === 500 ? "Dashboard data could not be loaded." : (error as Error).message }, {
      status,
      headers: { "Cache-Control": "no-store, private" },
    });
  }
}

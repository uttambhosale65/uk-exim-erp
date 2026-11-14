import "server-only";
import { getDashboardBusinessSummary } from "@/app/dashboard/business-summary-runtime";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await getDashboardBusinessSummary(), { headers: { "Cache-Control": "no-store, private" } }); }
  catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const status = code === "UNAUTHENTICATED" ? 401 : 500;
    return Response.json({ error: status === 401 ? "Sign in is required." : "Business summaries are unavailable." }, { status, headers: { "Cache-Control": "no-store, private" } });
  }
}

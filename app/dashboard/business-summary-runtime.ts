import "server-only";
import { getOwnerContext } from "@/app/lib/auth/dal";
import { getDatabasePool } from "@/app/lib/db/pool";
import { createDashboardBusinessSummaryDAL } from "./business-summary-dal.mjs";

const dal = createDashboardBusinessSummaryDAL({ getOwnerContext, database: getDatabasePool() });
export const getDashboardBusinessSummary = () => dal.getSummary();

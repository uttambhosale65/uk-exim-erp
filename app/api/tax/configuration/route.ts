import "server-only";
import { taxConfigurationDAL } from "@/app/tax/server/tax-api-runtime";
import { createTaxConfigurationRouteHandlers } from "@/app/tax/server/tax-routes.mjs";

const handlers = createTaxConfigurationRouteHandlers(taxConfigurationDAL);
export const dynamic = "force-dynamic";
export const GET = handlers.get;
export const PUT = handlers.save;

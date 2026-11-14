import "server-only";

import { supplierRouteHandlers as handlers } from "@/app/supplier/server/supplier-api-runtime";

export const dynamic = "force-dynamic";
export const POST = handlers.duplicateCheck;

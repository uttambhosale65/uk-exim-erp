import "server-only";

import { supplierRouteHandlers as handlers } from "@/app/supplier/server/supplier-api-runtime";

export const dynamic = "force-dynamic";

export const GET = handlers.list;
export const POST = handlers.create;

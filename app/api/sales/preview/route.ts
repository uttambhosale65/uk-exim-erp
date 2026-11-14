import "server-only";
import { saleHandlers as handlers } from "@/app/transactions/server/trade-api-runtime";

export const dynamic = "force-dynamic";
export const POST = handlers.preview;

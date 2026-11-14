import "server-only";
import { customerReceiptHandlers as handlers } from "@/app/transactions/server/settlement-api-runtime";

export const dynamic = "force-dynamic";
export const GET = handlers.list;
export const POST = handlers.create;

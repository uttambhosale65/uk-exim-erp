import "server-only";
import {listStockLedger} from "@/app/transactions/server/stock-api-runtime";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const url=new URL(request.url),limit=Number(url.searchParams.get("limit")||500),offset=Number(url.searchParams.get("offset")||0);return Response.json({events:await listStockLedger({limit,offset})},{headers:{"Cache-Control":"no-store, private"}});}catch(error){const value=error as {code?:string;message?:string};const status=value?.code==="UNAUTHENTICATED"?401:value?.code==="INVALID_QUERY"?400:value?.code==="SCHEMA_PENDING"?503:500;return Response.json({error:status===500?"Stock ledger could not be loaded.":value.message},{status});}}

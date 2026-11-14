import "server-only";
import {listStock} from "@/app/transactions/server/stock-api-runtime";
export const dynamic="force-dynamic";
export async function GET(){try{return Response.json({stock:await listStock()},{headers:{"Cache-Control":"no-store, private"}});}catch(error){const value=error as {code?:string;message?:string};if(value?.code==="UNAUTHENTICATED")return Response.json({error:value.message},{status:401});if(value?.code==="SCHEMA_PENDING")return Response.json({error:value.message},{status:503});return Response.json({error:"Stock could not be loaded."},{status:500});}}

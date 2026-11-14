import "server-only";
import {getOwnerContext} from "@/app/lib/auth/dal";
import {getDatabasePool,verifyProductsUiTestDatabasePool} from "@/app/lib/db/pool";
import {isProductsUiTestMode} from "@/app/lib/db/products-ui-test.mjs";
import {createStockDAL} from "./stock-dal.mjs";
import {requireTradeSchema} from "./trade-schema-guard.mjs";
const database=getDatabasePool(),testMode=isProductsUiTestMode();
const dal=createStockDAL({database,getOwnerContext:async()=>{const owner=await getOwnerContext();if(owner){if(testMode)await verifyProductsUiTestDatabasePool(database);await requireTradeSchema(database);}return owner;}});
export async function listStock(){return dal.listCurrentStock();}
export async function listStockLedger(options:{limit?:number;offset?:number}){return dal.listLedger(options);}

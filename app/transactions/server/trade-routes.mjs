import "server-only";
const privateHeaders={"Cache-Control":"no-store, private"};
function json(body,status=200){return Response.json(body,{status,headers:privateHeaders});}
function errorResponse(error){const status={UNAUTHENTICATED:401,INVALID_TRANSACTION:400,INVALID_TRANSACTION_ID:400,INVALID_QUERY:400,INVALID_UNIT:400,PURCHASE_POLICY:400,INVALID_TAX_INPUT:400,PLACE_OF_SUPPLY_REQUIRED:400,TAXABLE_NON_GST_BLOCKED:409,BILLING_TYPE_MISMATCH:409,MIXED_TAX_DOCUMENTS:409,TAX_CLASSIFICATION_UNAVAILABLE:409,TAX_SNAPSHOT_PROTECTED:409,TAX_SNAPSHOT_INVALID:409,REFERENCE_NOT_FOUND:409,INACTIVE_PRODUCT:409,INACTIVE_PARTNER:409,BASELINE_UNAVAILABLE:409,INSUFFICIENT_STOCK:409,DUPLICATE_TRANSACTION:409,HISTORICAL_PROTECTED:409,CUTOVER:409,TAX_POLICY_UNAPPROVED:409,SCHEMA_PENDING:503}[error?.code];return status?json({error:error.message},status):json({error:"The transaction request could not be completed."},500);}
function sameOrigin(request){try{return Boolean(request.headers.get("origin"))&&new URL(request.headers.get("origin")).origin===new URL(request.url).origin;}catch{return false;}}
async function body(request){try{return await request.json();}catch{throw Object.assign(new Error("Request body must be valid JSON."),{code:"INVALID_TRANSACTION"});}}
export function createTradeRouteHandlers(dal,type){
  return {
    async preview(request){if(!sameOrigin(request))return json({error:"Cross-origin requests are not allowed."},403);try{return json({preview:await dal.preview(type,await body(request))});}catch(e){return errorResponse(e);}},
    async list(request){try{const url=new URL(request.url);return json({transactions:await dal.list(type,{q:url.searchParams.get("q")||"",limit:Number(url.searchParams.get("limit")||200),offset:Number(url.searchParams.get("offset")||0)})});}catch(e){return errorResponse(e);}},
    async get(_request,id){try{const transaction=await dal.get(type,id);return transaction?json({transaction}):json({error:"Transaction not found."},404);}catch(e){return errorResponse(e);}},
    async create(request){if(!sameOrigin(request))return json({error:"Cross-origin writes are not allowed."},403);try{return json({transaction:await dal.create(type,await body(request))},201);}catch(e){return errorResponse(e);}},
    async update(request,id){if(!sameOrigin(request))return json({error:"Cross-origin writes are not allowed."},403);try{const value=await dal.update(type,id,await body(request));return value?json({transaction:value}):json({error:"Transaction not found."},404);}catch(e){return errorResponse(e);}},
    async remove(request,id){if(!sameOrigin(request))return json({error:"Cross-origin writes are not allowed."},403);try{return await dal.remove(type,id)?json({deleted:true}):json({error:"Transaction not found."},404);}catch(e){return errorResponse(e);}},
  };
}

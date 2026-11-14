import "server-only";
import { purchaseHandlers as handlers } from "@/app/transactions/server/trade-api-runtime";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){return handlers.get(request,(await context.params).id);}
export async function PUT(request:Request,context:Context){return handlers.update(request,(await context.params).id);}
export async function DELETE(request:Request,context:Context){return handlers.remove(request,(await context.params).id);}
